import { parseUUID } from '@minecraft-js/uuid';
import { AuctionCategory, ItemRarity } from '../Types';
import { parseNBTData } from '../utils';

/** An Auction */
export default class Auction {
  public rawData: any;

  public id: string;
  public seller: string;
  public profileId: string;
  public coopMembers: string[];
  public timestamps: {
    start: Date;
    end: Date;
  };
  public claimedBidders: string[];
  public bids: Bid[];
  public bin: boolean;
  public startingBid: number;

  public data: {
    name: string;
    lore: string[];
    category: AuctionCategory;
    rarity: ItemRarity;
  };
  public itemBytes: string;
  public itemData: any = null;

  public get claimed(): boolean {
    if (this.claimedBidders.length) return true;
    return false;
  }
  public get expired(): boolean {
    if (Date.now() > this.timestamps.end.getTime()) return true;
    return false;
  }
  public get ended(): boolean {
    return this.expired || this.claimed;
  }
  public get highestBid(): Bid | null {
    return this.bids.length
      ? this.bids.reduce((a, b) => {
          if (a.amount < b.amount) return b;
          return a;
        })
      : null;
  }
  public get lastUpdated(): number {
    if (this.timestamps.end.getTime() < Date.now()) return this.timestamps.end.getTime();
    if (this.bids.length) return this.bids.reduce((a, b) => (a.timestamp > b.timestamp ? a : b)).timestamp.getTime();
    return this.timestamps.start.getTime();
  }

  /**
   * An Auction
   * @param data Raw Auction Data
   */
  constructor(data?: any) {
    if (data) this.update(data);
  }

  /**
   * Update the Auction Data
   * @param data The New Data
   */
  public update(data) {
    this.rawData = data;

    this.id = parseUUID(data.uuid).toString(false);
    this.seller = parseUUID(data.auctioneer).toString(true);
    this.profileId = parseUUID(data.profile_id).toString(false);
    this.coopMembers = data.coop.map(i => parseUUID(i).toString(true));
    this.timestamps = {
      start: new Date(data.start),
      end: new Date(data.end),
    };
    this.claimedBidders = data.claimed_bidders.map(i => parseUUID(i).toString(true));
    this.bids = data.bids.map(info => ({
      auction: parseUUID(info.auction_id).toString(false),
      bidder: parseUUID(info.bidder).toString(true),
      profileId: parseUUID(info.profile_id).toString(false),
      amount: info.amount,
      timestamp: new Date(info.timestamp),
    }));
    this.bin = !!data.bin;
    this.startingBid = data.starting_bid;

    this.data = {
      name: data.item_name,
      lore: data.item_lore || [],
      rarity: data.tier || 'COMMON',
      category: data.category || 'misc',
    };
    this.itemBytes = typeof data.item_bytes === 'string' ? data.item_bytes : data.item_bytes?.data;
  }

  public async getItemData(refresh = false) {
    if (!refresh && this.itemData) return this.itemData;

    const nbt = (await parseNBTData(this.itemBytes)).parsed.value.i.value.value[0];

    this.itemData = {
      blockId: nbt.id.value,
      itemCount: nbt.Count.value,
      itemDamage: nbt.Damage.value,
      nbtData: {
        name: '',
        ...nbt.tag,
      },
    };

    return this.itemData;
  }

  public toMongoData(): AuctionMongoData {
    return {
      id: this.id,
      seller: this.seller,
      profileId: this.profileId,
      coopMembers: this.coopMembers,
      timestamps: {
        start: this.timestamps.start.getTime(),
        end: this.timestamps.end.getTime(),
      },
      claimedBidders: this.claimedBidders,
      bids: this.bids.map(b => ({
        ...b,
        timestamp: b.timestamp.getTime(),
      })),
      bin: this.bin,
      startingBid: this.startingBid,

      data: this.data,
      itemBytes: this.itemBytes,
      itemData: this.itemData,
    };
  }

  public static fromMongoData(data: AuctionMongoData): Auction {
    const auc = new Auction();

    auc.id = data.id;
    auc.seller = data.seller;
    auc.profileId = data.profileId;
    auc.coopMembers = data.coopMembers;
    auc.timestamps = {
      start: new Date(data.timestamps.start),
      end: new Date(data.timestamps.end),
    };
    auc.claimedBidders = data.claimedBidders;
    auc.bids = data.bids.map(b => ({
      ...b,
      timestamp: new Date(b.timestamp),
    }));
    auc.bin = data.bin;
    auc.startingBid = data.startingBid;

    auc.data = data.data;
    auc.itemBytes = data.itemBytes;
    auc.itemData = data.itemData;

    return auc;
  }
}

interface Bid {
  auction: string;
  bidder: string;
  profileId: string;
  amount: number;
  timestamp: Date;
}

export interface AuctionMongoData {
  id: string;
  seller: string;
  profileId: string;
  coopMembers: string[];
  timestamps: {
    start: number;
    end: number;
  };
  claimedBidders: string[];
  bids: (Omit<Bid, 'timestamp'> & {
    timestamp: number;
  })[];
  bin: boolean;
  startingBid: number;

  data: {
    name: string;
    lore: string[];
    category: AuctionCategory;
    rarity: ItemRarity;
  };
  itemBytes: string;
  itemData: any;
}
