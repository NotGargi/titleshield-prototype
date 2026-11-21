/**
 * Central Multi-State Portal Adapter Registry
 * Singleton managing live land registry adapters across India
 */

import { IPortalAdapter } from './types';
import { KarnatakaBhoomiAdapter } from './karnatakaBhoomiAdapter';
import { TelanganaDharaniAdapter } from './telanganaDharaniAdapter';
import { TamilNaduPattaChittaAdapter } from './tamilNaduPattaChittaAdapter';
import { MaharashtraMahabhumiAdapter } from './maharashtraMahabhumiAdapter';
import { UttarPradeshBhulekhAdapter } from './upBhulekhAdapter';

export class PortalAdapterRegistry {
  private static instance: PortalAdapterRegistry;
  private adapters: Map<string, IPortalAdapter> = new Map();

  private constructor() {
    this.registerAdapter(new KarnatakaBhoomiAdapter());
    this.registerAdapter(new TelanganaDharaniAdapter());
    this.registerAdapter(new TamilNaduPattaChittaAdapter());
    this.registerAdapter(new MaharashtraMahabhumiAdapter());
    this.registerAdapter(new UttarPradeshBhulekhAdapter());
  }

  public static getInstance(): PortalAdapterRegistry {
    if (!PortalAdapterRegistry.instance) {
      PortalAdapterRegistry.instance = new PortalAdapterRegistry();
    }
    return PortalAdapterRegistry.instance;
  }

  public registerAdapter(adapter: IPortalAdapter): void {
    this.adapters.set(adapter.stateCode.toUpperCase(), adapter);
  }

  public getAdapter(stateCode: string): IPortalAdapter | undefined {
    return this.adapters.get(stateCode.toUpperCase());
  }

  public hasAdapter(stateCode: string): boolean {
    return this.adapters.has(stateCode.toUpperCase());
  }

  public getAllAdapters(): IPortalAdapter[] {
    return Array.from(this.adapters.values());
  }

  public getSupportedStates(): string[] {
    return Array.from(this.adapters.keys());
  }
}
