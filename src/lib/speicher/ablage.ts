// Ablage auf dem Gerät (IndexedDB): Charaktere einzeln, dazu „zuletzt geöffnet“ und Einstellungen.

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Charakter } from './charakter';
import { migriere } from './migration';

export interface Einstellungen {
  darstellung: 'system' | 'hell' | 'dunkel';
  /** Je Würfelstelle: Würfelt die App oder wird von Hand eingegeben? Fehlt eine Stelle, gilt ihr Standard. */
  wuerfeln: Record<string, 'app' | 'hand'>;
}

export const STANDARD_EINSTELLUNGEN: Einstellungen = { darstellung: 'system', wuerfeln: {} };

interface CqbDb extends DBSchema {
  charaktere: { key: string; value: Charakter };
  meta: { key: string; value: unknown };
}

const DB_NAME = 'cqb';
const DB_VERSION = 1;

export class Ablage {
  private constructor(private db: IDBPDatabase<CqbDb>) {}

  static async oeffnen(name: string = DB_NAME): Promise<Ablage> {
    const db = await openDB<CqbDb>(name, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('charaktere')) db.createObjectStore('charaktere', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta');
      }
    });
    return new Ablage(db);
  }

  /** Alle Charaktere, auf das aktuelle Schema gebracht. Nicht lesbare werden übersprungen und gemeldet. */
  async alle(): Promise<{ charaktere: Charakter[]; fehler: string[] }> {
    const roh = await this.db.getAll('charaktere');
    const charaktere: Charakter[] = [];
    const fehler: string[] = [];
    for (const r of roh) {
      try {
        charaktere.push(migriere(r));
      } catch (e) {
        fehler.push(`${(r as { name?: string }).name ?? r.id}: ${(e as Error).message}`);
      }
    }
    return { charaktere, fehler };
  }

  async holen(id: string): Promise<Charakter | undefined> {
    const r = await this.db.get('charaktere', id);
    return r ? migriere(r) : undefined;
  }

  async speichern(c: Charakter): Promise<void> {
    const kopie = structuredClone({ ...c, geaendert: new Date().toISOString() });
    await this.db.put('charaktere', kopie);
  }

  async loeschen(id: string): Promise<void> {
    await this.db.delete('charaktere', id);
    if ((await this.zuletztGeoeffnet()) === id) await this.db.delete('meta', 'zuletzt_geoeffnet');
  }

  async zuletztGeoeffnet(): Promise<string | undefined> {
    return (await this.db.get('meta', 'zuletzt_geoeffnet')) as string | undefined;
  }

  async setzeZuletztGeoeffnet(id: string): Promise<void> {
    await this.db.put('meta', id, 'zuletzt_geoeffnet');
  }

  async einstellungen(): Promise<Einstellungen> {
    const e = (await this.db.get('meta', 'einstellungen')) as Partial<Einstellungen> | undefined;
    return { ...STANDARD_EINSTELLUNGEN, ...e };
  }

  async speichereEinstellungen(e: Einstellungen): Promise<void> {
    await this.db.put('meta', structuredClone(e), 'einstellungen');
  }

  schliessen(): void {
    this.db.close();
  }
}
