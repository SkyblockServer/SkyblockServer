import { parseUUID } from '@minecraft-js/uuid';
import axios from 'axios';

/** A Manager for Caching Players */
export default class PlayerManager {
  /** The Player Cache */
  public cache: Map<string, Player>;

  /** A Manager for Players */
  constructor() {
    this.cache = new Map();
  }

  /**
   * Parses and converts a UUID to dashed-format
   * @param uuid The UUID
   */
  public parseUUID(uuid: string): string {
    return parseUUID(uuid).toString(true);
  }

  /**
   * Fetch a Player by their UUID
   * @param uuid The UUID
   * @param force Whether to ignore the cache and force fetch the Player
   */
  public async fetchUUID(uuid: string, force = false): Promise<Player> {
    uuid = this.parseUUID(uuid);

    if (!force) {
      if (this.cache.has(uuid)) return this.cache.get(uuid);
    }

    const data = (await axios
      .get(`https://sessionserver.mojang.com/session/minecraft/profile/${uuid}`)
      .then(res => {
        if (res.status === 200) {
          return {
            username: res.data.name,
            uuid: this.parseUUID(res.data.id),
          };
        } else return null;
      })
      .catch(() => null)) as Player;

    if (!data) throw new Error(`Player with UUID "${uuid}" does not exist!`);

    this.cache.set(data.uuid, data);

    return data;
  }

  /**
   * Fetch a Player by their Username
   * @param uuid The Username
   * @param force Whether to ignore the cache and force fetch the Player
   */
  public async fetchUsername(username: string, force = false): Promise<Player> {
    if (!force) {
      const user = [...this.cache.values()].find(i => i.username.toLowerCase() === username.toLowerCase());
      if (user) return user;
    }

    const data = (await axios
      .get(`https://api.mojang.com/users/profiles/minecraft/${username}`)
      .then(res => {
        if (res.status === 200) {
          return {
            username: res.data.name,
            uuid: this.parseUUID(res.data.id),
          };
        } else return null;
      })
      .catch(() => null)) as Player;

    if (!data) throw new Error(`Player with Username "${username}" does not exist!`);

    this.cache.set(data.uuid, data);

    return data;
  }
}

export interface Player {
  uuid: string;
  username: string;
}
