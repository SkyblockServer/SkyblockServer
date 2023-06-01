import { parseUUID } from '@minecraft-js/uuid';
import { IncomingPacketIDs, OutgoingPacketIDs, OutgoingPacketTypes, readOutgoingPacket, writeIncomingPacket } from '@skyblock-server/protocol';
import Packet from '@skyblock-server/protocol/dist/Packet';
import { once } from 'events';
import { EventEmitter } from 'stream';
import TypedEmitter from 'typed-emitter';
import { WebSocket } from 'ws';
import { connections } from '.';
import { hypixel, players } from '..';
import { auctions } from '../caches/auctions';
import Logger from '../classes/Logger';
import { ConnectionSettings } from '../constants';
import { genRandomUUID, wait } from '../utils';

const logger = new Logger('Connection');

/*
Close Codes:

4000 = Invalid Data
4001 = Failed to Heartbeat in Time
4002 = Invalid Identify
4003 = Failed to Resume


Session gets removed after time set in ConnectionSettings under "session_removal_timeout"


Sequence number should increment every time you recieve a message (starting at 1, so the first message gets you to 2), if you recieve a SESSION_CREATE, you set the sequence number to that number, as that number is the sequence number of that SESSION_CREATE message.
On resume, use the sequence number of the message you last got in the "seq" header and the server will auto-replay the missed events.
*/

export default class Connection {
  public readonly events: TypedEmitter<ConnectionEvents>;

  public socket: WebSocket;

  public messages: Buffer[] = [];
  public get seq(): number {
    return this.messages.length + 1;
  }

  public identity: {
    uuid: string;
    username: string;
    apiKey: string;
  };

  public get connected(): boolean {
    return !!this.socket;
  }

  public id: string;

  constructor() {
    this.events = new (EventEmitter as new () => TypedEmitter<ConnectionEvents>)();
    this.events.setMaxListeners(0);
  }

  public connect(socket: WebSocket, resume: true, lastSeq: number): void;
  public connect(socket: WebSocket, resume: false): void;
  public connect(socket: WebSocket, resume: boolean, lastSeq?: number): void {
    if (resume && (isNaN(lastSeq) || lastSeq > this.seq)) return socket.close(CloseCodes.RESUME_FAILED, 'Invalid Sequence Number');

    this.socket = socket;

    this.setupListeners();

    if (resume) this.runResumeProtocol(lastSeq);
    else this.runInitialProtocol();

    this.events.emit('connected');
  }

  private setupListeners() {
    this.socket.on('error', err => logger.error(err));
    this.socket.on('close', async () => {
      this.socket = null;
      if (!this.id) return;
      const remove = await Promise.race([wait(ConnectionSettings.session_removal_timeout).then(() => true), once(this.events, 'connected').then(() => false)]);
      if (remove) connections.delete(this.id);
    });

    this.socket.on('ping', () => this.socket.pong());

    this.socket.on('message', async raw => {
      let msg: ReturnType<typeof readOutgoingPacket>;
      try {
        msg = readOutgoingPacket(raw as Buffer);
      } catch {
        return this.close(CloseCodes.INVALID_MESSAGE, 'Invalid Data');
      }

      this.events.emit('message', msg);

      switch (msg.id) {
        case OutgoingPacketIDs.RequestAuctions:
          let items = [...auctions.values()];

          // @ts-ignore - wtf
          if (msg.data.query.length) items = items.filter(a => a.data.name.toLowerCase().includes(msg.data.query.trim().toLowerCase()));

          for (const filter of msg.data.filters) {
            switch (filter.type) {
              case 'category':
                items = items.filter(a => a.data.category === filter.value.toLowerCase().trim());
                break;

              case 'rarity':
                items = items.filter(a => a.data.rarity === filter.value.toUpperCase().trim());
                break;

              case 'type':
                // No need to do anything for "any" because all items are already included unless changed by another filter
                if (filter.value.toLowerCase().trim() === 'bin') items = items.filter(a => a.bin);
                else if (filter.value.toLowerCase().trim() === 'auction') items = items.filter(a => !a.bin);
                break;

              default:
                break;
            }
          }

          items = items.sort((a, b) => {
            // @ts-ignore - wtf
            switch (msg.data.order.trim()) {
              case 'high_price':
                if (!a.highestBid && !b.highestBid) return 0;
                else if (!a.highestBid && b.highestBid) return 1;
                else if (a.highestBid && !b.highestBid) return -1;

                if (a.highestBid.amount === b.highestBid.amount) return 0;
                else if (a.highestBid.amount < b.highestBid.amount) return 1;
                else if (a.highestBid.amount > b.highestBid.amount) return -1;

                break;

              case 'low_price':
                if (!a.highestBid && !b.highestBid) return 0;
                else if (!a.highestBid && b.highestBid) return -1;
                else if (a.highestBid && !b.highestBid) return 1;

                if (a.highestBid.amount === b.highestBid.amount) return 0;
                else if (a.highestBid.amount < b.highestBid.amount) return -1;
                else if (a.highestBid.amount > b.highestBid.amount) return 1;

                break;

              case 'end_near':
                if (a.timestamps.end > b.timestamps.end) return 1;
                if (a.timestamps.end < b.timestamps.end) return -1;

                break;

              case 'end_far':
                if (a.timestamps.end > b.timestamps.end) return -1;
                if (a.timestamps.end < b.timestamps.end) return 1;

                break;

              case 'random':
                return Math.floor(Math.random() * 3) - 1;

              default:
                break;
            }

            return 0;
          });

          await this.send(
            writeIncomingPacket(IncomingPacketIDs.Auctions, {
              auctions: await Promise.all(
                items.splice(msg.data.start, msg.data.amount).map(async a => {
                  const itemData = await a.getItemData(true);
                  const highestBid = a.highestBid;

                  return {
                    auction_id: a.id,
                    seller: a.seller,
                    seller_profile: a.profileId,
                    itemBytes: a.itemBytes,
                    itemData: JSON.stringify(itemData),
                    timestamps: {
                      start: a.timestamps.start.getTime(),
                      end: a.timestamps.end.getTime(),
                    },
                    claimed: a.claimed,
                    ended: a.ended,
                    startingBid: a.startingBid,
                    highestBid: highestBid ? highestBid.amount : 0,
                    lastUpdated: a.lastUpdated,
                    bids: a.bids.map(b => ({
                      bidder: b.bidder,
                      bidder_profile: b.profileId,
                      amount: b.amount,
                      timestamp: b.timestamp.getTime(),
                    })),
                  };
                })
              ),
            })
          );

          break;

        default:
          break;
      }
    });
  }

  public async awaitMessage<T extends keyof OutgoingPacketTypes>(id: T, timeout?: number): Promise<OutgoingPacketTypes[T] | null> {
    let aborter = new AbortController();
    if (timeout) setTimeout(() => aborter.abort(), timeout);

    let data = null;

    while (!data && !aborter.signal.aborted) {
      const [msg] = await once(this.events, 'message', {
        signal: aborter.signal,
      }).catch(() => [{}]);

      if (msg.id == id) data = msg.data;
    }

    return data;
  }

  public send(packet: Packet, reject: boolean = false): Promise<boolean> {
    return new Promise((res, rej) => {
      if (this.socket?.readyState === WebSocket.OPEN)
        this.socket.send(packet.buf.buffer, err => {
          this.messages.push(packet.buf.buffer);

          if (err) {
            if (reject) rej(err);
            else res(false);
          } else res(true);
        });
    });
  }
  public sendRaw(data: Buffer, reject: boolean = false): Promise<boolean> {
    return new Promise((res, rej) => {
      if (this.socket?.readyState === WebSocket.OPEN)
        this.socket.send(data, err => {
          if (err) {
            if (reject) rej(err);
            else res(false);
          } else res(true);
        });
    });
  }

  public close(code: CloseCodes, reason?: string) {
    if (this.socket?.readyState === WebSocket.OPEN) this.socket.close(code, reason);
    this.socket = null;
  }

  private async setupHeartbeatListener() {
    while (this.connected) {
      const msg = await this.awaitMessage(
        OutgoingPacketIDs.Heartbeat,
        ConnectionSettings.heartbeat_interval * 1.5 // 1.5x the heartbeat interval
      );

      if (!msg) return this.close(CloseCodes.HEARTBEAT_FAILED, 'Failed to send a Heartbeat within 1.5x the heartbeat interval');
    }
  }

  private async runInitialProtocol() {
    this.messages = [];

    await this.send(
      writeIncomingPacket(IncomingPacketIDs.Metadata, {
        heartbeat_interval: ConnectionSettings.heartbeat_interval,
      })
    );
    this.setupHeartbeatListener();

    const identity = await this.awaitMessage(OutgoingPacketIDs.Identify, ConnectionSettings.identify_timeout);
    if (!identity) return this.close(CloseCodes.INVALID_IDENTIFY, 'Failed to identify in time');

    if (
      !(await players
        .fetchUUID(identity.uuid, true)
        .then(() => true)
        .catch(() => false))
    )
      return this.close(CloseCodes.INVALID_IDENTIFY, 'Invalid UUID');
    if (
      !(await players
        .fetchUsername(identity.username, true)
        .then(() => true)
        .catch(() => false))
    )
      return this.close(CloseCodes.INVALID_IDENTIFY, 'Invalid Username');
    if ((await players.fetchUUID(identity.uuid)).uuid !== (await players.fetchUsername(identity.username)).uuid) return this.close(CloseCodes.INVALID_IDENTIFY, 'Username and UUID do not match!');
    if (!(await hypixel.fetchKeyInfo(identity.apiKey)).success) return this.close(CloseCodes.INVALID_IDENTIFY, 'Invalid API Key');

    const user = await players.fetchUUID(identity.uuid);
    this.identity = {
      uuid: parseUUID(user.uuid).toString(true),
      username: user.username,
      apiKey: identity.apiKey,
    };

    this.id = genRandomUUID();

    connections.set(this.id, this);

    await this.send(
      writeIncomingPacket(IncomingPacketIDs.SessionCreate, {
        session_id: this.id,
        seq: this.seq + 1,
      })
    );
  }

  private async runResumeProtocol(lastSeq: number) {
    await this.send(
      writeIncomingPacket(IncomingPacketIDs.Metadata, {
        heartbeat_interval: ConnectionSettings.heartbeat_interval,
      })
    );
    this.setupHeartbeatListener();

    // We want to ignore the fact that there is already this packet ^^^^ in the messages cache, so we use " - 1" and " > 1"

    this.messages.splice(0, lastSeq - 1);
    for (let i = 0; i < this.messages.length - 1; i++)
      await this.sendRaw(this.messages[i]).then(success => {
        if (success) this.messages.splice(i, 1);
      });
    if (this.messages.length > 1) return this.close(CloseCodes.RESUME_FAILED, 'Failed to replay all missed packets');

    this.messages = [];

    await this.send(
      writeIncomingPacket(IncomingPacketIDs.SessionCreate, {
        session_id: this.id,
        seq: this.seq + 1,
      })
    );
  }
}

export type ConnectionEvents = {
  connected: () => void;
  message: (data: ReturnType<typeof readOutgoingPacket>) => void;
};

export enum CloseCodes {
  INVALID_MESSAGE = 4000,
  HEARTBEAT_FAILED = 4001,
  INVALID_IDENTIFY = 4002,
  RESUME_FAILED = 4003,
}
