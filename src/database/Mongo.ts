import { Collection, DeleteResult, Filter, InsertManyResult, MongoClient, UpdateResult } from 'mongodb';
import Auction, { AuctionMongoData } from '../classes/Auction';
import Logger from '../classes/Logger';

const logger = new Logger('MongoDB');

/** A Mongo Client we use */
export default class Mongo {
  public client: MongoClient;

  public auctions: Collection<AuctionMongoData>;

  constructor(url = process.env.MONGO_URL) {
    this.client = new MongoClient(url, {
      retryWrites: true,
      compressors: ['snappy', 'zlib', 'zstd'],
      zlibCompressionLevel: 9,
      appName: 'SkyblockServer',
    });
  }

  public async connect(): Promise<this> {
    await this.client.connect().then(() => logger.log('Connected!'));

    this.auctions = this.client.db('Auctions').collection('auctions');

    return this;
  }

  public async resetAuctions(): Promise<this> {
    await this.auctions.drop();

    this.auctions = await this.client.db('Auctions').createCollection('auctions');

    return this;
  }

  public async addAuctions(auctions: AuctionMongoData[]): Promise<InsertManyResult<AuctionMongoData>> {
    return await this.auctions.insertMany(auctions, {
      ordered: false,
      writeConcern: { w: 0 },
      bypassDocumentValidation: true,
    });
  }

  public async addAuction(auction: AuctionMongoData): Promise<UpdateResult<AuctionMongoData>> {
    return await this.auctions.updateOne(
      {
        id: auction.id,
      },
      {
        $set: auction,
      },
      {
        upsert: true,
        bypassDocumentValidation: true,
      }
    );
  }

  public async deleteAuction(id: string): Promise<DeleteResult> {
    return await this.auctions.deleteOne({
      id,
    });
  }

  public async findAuctions(filter: Filter<AuctionMongoData>, asAuctionObjects?: false): Promise<AuctionMongoData[]>;
  public async findAuctions(filter: Filter<AuctionMongoData>, asAuctionObjects?: true): Promise<Auction[]>;
  public async findAuctions(filter: Filter<AuctionMongoData>, asAuctionObjects: boolean = false): Promise<AuctionMongoData[] | Auction[]> {
    const auctions = await this.auctions.find(filter).toArray();

    if (asAuctionObjects) return auctions.map(a => Auction.fromMongoData(a));
    return auctions;
  }

  public async getAuctionCount(filter?: Filter<AuctionMongoData>): Promise<number> {
    return await this.auctions.countDocuments(filter);
  }
}
