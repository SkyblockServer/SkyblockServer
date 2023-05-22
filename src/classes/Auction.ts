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
  public itemBytes: string;
  public claimedBidders: string[];
  public bids: Bid[];
  public bin: boolean;

  public get claimed(): boolean {
    if (this.claimedBidders.length) return true;
    return false;
  }
  public get ended(): boolean {
    if (Date.now() > this.timestamps.end.getTime()) return true;
    return this.claimed;
  }
  public get highestBid(): Bid {
    return this.bids.reduce((a, b) => {
      if (a.amount < b.amount) return b;
      return a;
    });
  }

  /**
   * An Auction
   * @param data Raw Auction Data
   */
  constructor(data) {
    this.update(data);
  }

  /**
   * Update the Auction Data
   * @param data The New Data
   */
  public update(data) {
    this.rawData = data;

    this.id = data.uuid;
    this.seller = data.auctioneer;
    this.profileId = data.profile_id;
    this.coopMembers = data.coop;
    this.timestamps = {
      start: new Date(data.start),
      end: new Date(data.end),
    };
    this.itemBytes = typeof data.item_bytes === 'string' ? data.item_bytes : data.item_bytes?.data;
    this.claimedBidders = data.claimed_bidders;
    this.bids = data.bids;
    this.bin = !!data.bin;
  }
}

interface Bid {
  auction: string;
  bidder: string;
  profileId: string;
  amount: number;
  timestamp: Date;
}
