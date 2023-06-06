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
    start: number;
    end: number;
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
    if (Date.now() > this.timestamps.end) return true;
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
    if (this.timestamps.end < Date.now()) return this.timestamps.end;
    if (this.bids.length) return this.bids.reduce((a, b) => (a.timestamp > b.timestamp ? a : b)).timestamp;
    return this.timestamps.start;
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
      start: data.start,
      end: data.end,
    };
    this.claimedBidders = data.claimed_bidders.map(i => parseUUID(i).toString(true));
    this.bids = data.bids.map(bid => ({
      auction: parseUUID(bid.auction_id).toString(false),
      bidder: parseUUID(bid.bidder).toString(true),
      profileId: parseUUID(bid.profile_id).toString(false),
      amount: bid.amount,
      timestamp: bid.timestamp,
    }));
    this.bin = !!data.bin;
    this.startingBid = data.starting_bid;

    this.data = {
      name: data.item_name,
      lore: data.item_lore ? (Array.isArray(data.item_lore) ? data.item_lore : data.item_lore.split('\n')) : [],
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
        start: this.timestamps.start,
        end: this.timestamps.end,
      },
      claimedBidders: this.claimedBidders,
      bids: this.bids.map(b => ({
        ...b,
        timestamp: b.timestamp,
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
      start: data.timestamps.start,
      end: data.timestamps.end,
    };
    auc.claimedBidders = data.claimedBidders;
    auc.bids = data.bids;
    auc.bin = data.bin;
    auc.startingBid = data.startingBid;

    auc.data = data.data;
    auc.itemBytes = data.itemBytes;
    auc.itemData = data.itemData;

    return auc;
  }

  public async toAPIData() {
    const highestBid = this.highestBid;

    return {
      auction_id: this.id,
      seller: this.seller,
      seller_profile: this.profileId,
      itemBytes: this.itemBytes,
      itemData: await this.getItemData(true),
      timestamps: {
        start: this.timestamps.start,
        end: this.timestamps.end,
      },
      startingBid: this.startingBid,
      highestBid: highestBid ? highestBid.amount : 0,
      lastUpdated: this.lastUpdated,
      bids: this.bids.map(b => ({
        bidder: b.bidder,
        bidder_profile: b.profileId,
        amount: b.amount,
        timestamp: b.timestamp,
      })),

      claimed: this.claimed,
      expired: this.expired,
      ended: this.ended,
    };
  }
}

interface Bid {
  auction: string;
  bidder: string;
  profileId: string;
  amount: number;
  timestamp: number;
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
