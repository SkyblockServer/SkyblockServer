import { parseUUID } from '@minecraft-js/uuid';
import { Router } from 'express';
import { Filter } from 'mongodb';
import { mongo, players } from '..';
import Auction, { AuctionMongoData } from '../classes/Auction';
import ratelimit from '../utils/ratelimit';

const router = Router();

router.get('/get/:id', ratelimit(60), async (req, res) => {
  let auction: Auction;

  try {
    const id = parseUUID(req.params.id).toString(false);
    auction = (
      await mongo.findAuctions(
        {
          id,
        },
        true
      )
    )[0];
  } catch {}

  if (!auction) return res.error('This auction does not exist or has not been cached yet!', 404);

  return res.success(await auction.toAPIData());
});

/*
Options (Query Parameters):

NOTE: All Optional

- "query": Search Query - Default none

- "category": Auction Category ('weapon' | 'armor' | 'accessories' | 'consumables' | 'blocks' | 'misc') - Default all

- "rarity": Auction Item Rarity ('COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'MYTHIC' | 'DIVINE' | 'SPECIAL' | 'VERY_SPECIAL') - Default all

- "type": Auction Type ('bin' | 'auction') - Default both

- "order": Sort Order ('high_price' | 'low_price' | 'end_near' | 'end_far' | 'random') - Default 'random'

- "start": Numerical 0-Based Index of the First Item to Get - Default 0
- "amount": Numerical Value of the Amount of Items to Get - Default 100
*/
router.get('/find', ratelimit(30), async (req, res) => {
  const filter: Filter<AuctionMongoData> = {
    $where: function () {
      const checks = [];

      if (typeof req.query.query === 'string') checks.push(this.data.name.trim().toLowerCase().includes(req.query.query.trim().toLowerCase()));

      if (req.query.category) checks.push(this.data.category == (req.query.category as any)?.toLowerCase?.()?.trim?.());
      if (req.query.rarity) checks.push(this.data.rarity == (req.query.rarity as any)?.toUpperCase?.()?.trim?.()?.replace?.(/ /g, '_'));

      if (req.query.type) {
        const typeQuery = (req.query.type as any)?.trim?.()?.toLowerCase?.();

        if (typeQuery == 'bin') checks.push(this.bin == true);
        else if (typeQuery == 'auction') checks.push(this.bin == false);
      }

      return checks.reduce((a, b) => a && b, true);
    },
  };

  const items = (await mongo.findAuctions(filter, true)).sort((a, b) => {
    switch ((req.query.order as any)?.trim?.()?.toLowerCase?.()) {
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

  res.success(await Promise.all(items.splice(isNaN(req.query.start as any) ? 0 : parseInt(req.query.start as any), isNaN(req.query.amount as any) ? 100 : parseInt(req.query.amount as any)).map(a => a.toAPIData())));
});

router.get('/amounts', ratelimit(15), async (req, res) => {
  const auctionCount = await mongo.getAuctionCount({
    bin: false,
  });
  const binCount = await mongo.getAuctionCount({
    bin: true,
  });

  return res.success({
    total: auctionCount + binCount,
    auction: auctionCount,
    bin: binCount,
  });
});

// Identifier can be a Username or a UUID
router.get('/user/:identifier', ratelimit(45), async (req, res) => {
  const identifier = req.params.identifier;

  let uuid: string = await players.fetchUUID(identifier).then(
    player => player.uuid,
    async () => {
      return await players.fetchUsername(identifier).then(
        player => player.uuid,
        () => null
      );
    }
  );

  if (!uuid) return res.error('This user does not exist!');

  const [selling, bought, bidding] = await Promise.all([
    mongo.findAuctions(
      {
        seller: uuid,
      },
      true
    ),
    mongo.findAuctions(
      {
        claimedBidders: uuid,
      },
      true
    ),
    mongo.findAuctions(
      {
        bids: {
          bidder: uuid,
        },
      },
      true
    ),
  ]);

  // TODO: Promise.all these somehow for more speed
  return res.success({
    selling: await Promise.all(selling.map(a => a.toAPIData())),
    bought: await Promise.all(bought.map(a => a.toAPIData())),
    bidding: await Promise.all(bidding.map(a => a.toAPIData())),
  });
});

export default router;
