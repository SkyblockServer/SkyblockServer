export type ValueOf<T> = T[keyof T];

export type ItemRarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'MYTHIC' | 'DIVINE' | 'SPECIAL' | 'VERY_SPECIAL';

export type AuctionCategory = 'weapon' | 'armor' | 'accessories' | 'consumables' | 'blocks' | 'misc';
