export type ValueOf<T> = T[keyof T];

export const AuctionCategories = ['weapon', 'armor', 'accessories', 'consumables', 'blocks', 'misc'] as const;
export type AuctionCategory = (typeof AuctionCategories)[number];

export const ItemRarities = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC', 'DIVINE', 'SPECIAL', 'VERY_SPECIAL'] as const;
export type ItemRarity = (typeof ItemRarities)[number];

export const AuctionSortOrders = ['high_price', 'low_price', 'end_near', 'end_far', 'random'] as const;
export type AuctionSortOrder = (typeof AuctionSortOrders)[number];
