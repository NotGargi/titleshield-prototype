import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { DATA_DIR } from '../db';

export const tilesRouter = Router();

// ============================================================================
// CONSTANTS & REGISTRY (Self-contained in server/src for TS rootDir isolation)
// ============================================================================

export const EARTH_RADIUS_METERS = 6378137.0;
export const MAX_MERCATOR_EXTENT = Math.PI * EARTH_RADIUS_METERS; // 20037508.342789244

export interface StateWmsConfig {
  stateCode: string;
  stateName: string;
  department: string;
  wmsBaseUrl: string;
  layers: string;
  villageLayer?: string;
  version: '1.1.1' | '1.3.0';
  backupUrl?: string;
  backupLayers?: string;
}

export const STATE_WMS_REGISTRY: Record<string, StateWmsConfig> = {
  MH: {
    stateCode: 'MH',
    stateName: 'Maharashtra',
    department: 'MahaBhumi (MahaBhuNaksha)',
    wmsBaseUrl: 'https://mahabhunakasha.mahabhumi.gov.in/geoserver/wms',
    layers: 'mahabhunaksha:cadastral_parcels',
    villageLayer: 'mahabhunaksha:village_boundary',
    version: '1.1.1',
    backupUrl: 'https://bhuvan-vec1.nrsc.gov.in/bhuvan/wms',
    backupLayers: 'cadastral:MH_Cad'
  },
  UP: {
    stateCode: 'UP',
    stateName: 'Uttar Pradesh',
    department: 'UP Bhulekh / UP BhuNaksha',
    wmsBaseUrl: 'https://upbhunaksha.gov.in/geoserver/wms',
    layers: 'upbhunaksha:khasra_parcels',
    villageLayer: 'upbhunaksha:village_map',
    version: '1.1.1',
    backupUrl: 'https://bhuvan-vec1.nrsc.gov.in/bhuvan/wms',
    backupLayers: 'cadastral:UP_Cad'
  },
  KA: {
    stateCode: 'KA',
    stateName: 'Karnataka',
    department: 'KSRSAC (Bhoomi / KGIS)',
    wmsBaseUrl: 'https://kgis.ksrsac.in/geoserver/wms',
    layers: 'kgis:cadastral_survey_boundaries',
    villageLayer: 'kgis:revenue_villages',
    version: '1.1.1',
    backupUrl: 'https://bhuvan-vec1.nrsc.gov.in/bhuvan/wms',
    backupLayers: 'cadastral:KA_Cad'
  },
  MP: {
    stateCode: 'MP',
    stateName: 'Madhya Pradesh',
    department: 'MP Bhulekh / BhuNaksha',
    wmsBaseUrl: 'https://mpbhunaksha.nic.in/geoserver/wms',
    layers: 'mpbhunaksha:khasra_boundaries',
    villageLayer: 'mpbhunaksha:village_map',
    version: '1.1.1',
    backupUrl: 'https://bhuvan-vec1.nrsc.gov.in/bhuvan/wms',
    backupLayers: 'cadastral:MP_Cad'
  },
  RJ: {
    stateCode: 'RJ',
    stateName: 'Rajasthan',
    department: 'Apna Khata / BhuNaksha',
    wmsBaseUrl: 'https://bhunaksha.rajasthan.gov.in/geoserver/wms',
    layers: 'rajbhunaksha:khasra_parcels',
    villageLayer: 'rajbhunaksha:village_boundary',
    version: '1.1.1',
    backupUrl: 'https://bhuvan-vec1.nrsc.gov.in/bhuvan/wms',
    backupLayers: 'cadastral:RJ_Cad'
  },
  TG: {
    stateCode: 'TG',
    stateName: 'Telangana',
    department: 'Dharani Integrated Cadastre',
    wmsBaseUrl: 'https://dharani.telangana.gov.in/geoserver/wms',
    layers: 'dharani:survey_parcels',
    villageLayer: 'dharani:revenue_villages',
    version: '1.1.1',
    backupUrl: 'https://bhuvan-vec1.nrsc.gov.in/bhuvan/wms',
    backupLayers: 'cadastral:TG_Cad'
  },
  TN: {
    stateCode: 'TN',
    stateName: 'Tamil Nadu',
    department: 'Tamil Nilam FMB Cadastre',
    wmsBaseUrl: 'https://eservices.tn.gov.in/geoserver/wms',
    layers: 'tn_survey:fmb_sketch_parcels',
    villageLayer: 'tn_survey:village_boundaries',
    version: '1.1.1',
    backupUrl: 'https://bhuvan-vec1.nrsc.gov.in/bhuvan/wms',
    backupLayers: 'cadastral:TN_Cad'
  },
  DL: {
    stateCode: 'DL',
    stateName: 'Delhi',
    department: 'GSDL Cadastre',
    wmsBaseUrl: 'https://gsdl.delhi.gov.in/geoserver/wms',
    layers: 'gsdl:cadastral_khasra_parcels',
    villageLayer: 'gsdl:revenue_villages',
    version: '1.1.1',
    backupUrl: 'https://bhuvan-vec1.nrsc.gov.in/bhuvan/wms',
    backupLayers: 'cadastral:DL_Cad'
  },
  DEFAULT: {
    stateCode: 'IN',
    stateName: 'Pan-India',
    department: 'NRSC / ISRO Bhuvan OGC Cadastre',
    wmsBaseUrl: 'https://bhuvan-vec1.nrsc.gov.in/bhuvan/wms',
    layers: 'cadastral:cadastral_india',
    villageLayer: 'india3:revenue_villages',
    version: '1.1.1',
    backupUrl: 'https://bhuvan-vec2.nrsc.gov.in/bhuvan/wms',
    backupLayers: 'cadastral:cadastral_india'
  }
};

export function getStateConfig(stateCode?: string): StateWmsConfig {
  if (!stateCode) return STATE_WMS_REGISTRY.DEFAULT;
  const upper = stateCode.trim().toUpperCase();
  return STATE_WMS_REGISTRY[upper] || STATE_WMS_REGISTRY.DEFAULT;
}

// 256x256 32-bit RGBA Transparent PNG (exact 334 bytes)
export const TRANSPARENT_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAYAAABccqhmAAABFUlEQVR42u3BMQEAAADCoPVP7WsIoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAeAMBPAAB2ClDBAAAAABJRU5ErkJggg==';

export const TRANSPARENT_256_PNG = Buffer.from(TRANSPARENT_PNG_BASE64, 'base64');

// PNG Magic Header validation (0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A)
export function isValidPng(buf: Buffer): boolean {
  return (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  );
}

// ============================================================================
// EPSG:3857 BBOX CALCULATION
// ============================================================================

export function tileToEPSG3857BBox(
  x: number,
  y: number,
  z: number
): { minX: number; minY: number; maxX: number; maxY: number; bboxString: string } {
  const numTiles = Math.pow(2, z);
  const tileSize = (2 * MAX_MERCATOR_EXTENT) / numTiles;
  const minX = -MAX_MERCATOR_EXTENT + x * tileSize;
  const maxX = -MAX_MERCATOR_EXTENT + (x + 1) * tileSize;
  const maxY = MAX_MERCATOR_EXTENT - y * tileSize;
  const minY = MAX_MERCATOR_EXTENT - (y + 1) * tileSize;

  return {
    minX,
    minY,
    maxX,
    maxY,
    bboxString: `${minX.toFixed(2)},${minY.toFixed(2)},${maxX.toFixed(2)},${maxY.toFixed(2)}`
  };
}

// ============================================================================
// TWO-TIER CACHING (Tier 1: In-Memory Map LRU + Tier 2: Filesystem Disk)
// ============================================================================

export class TileLruCache {
  private cache = new Map<string, Buffer>();
  private readonly maxItems: number;

  constructor(maxItems = 1000) {
    this.maxItems = maxItems;
  }

  get(key: string): Buffer | undefined {
    const val = this.cache.get(key);
    if (!val) return undefined;
    // Refresh recency via delete-and-set
    this.cache.delete(key);
    this.cache.set(key, val);
    return val;
  }

  set(key: string, val: Buffer): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxItems) {
      const oldest = this.cache.keys().next().value;
      if (oldest) this.cache.delete(oldest);
    }
    this.cache.set(key, val);
  }

  get size(): number {
    return this.cache.size;
  }

  clear(): void {
    this.cache.clear();
  }
}

export const memoryCache = new TileLruCache(1000);
export const CACHE_DIR = path.join(DATA_DIR, 'cache', 'tiles');

// Ensure disk cache directory exists
try {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
} catch (e: any) {
  console.warn('[TileProxy] Notice creating cache directory:', e?.message || e);
}

// ============================================================================
// UPSTREAM FETCH WITH TIMEOUT & VALIDATION
// ============================================================================

export async function fetchUpstreamTile(
  url: string,
  timeoutMs = 4000
): Promise<{ ok: boolean; buffer?: Buffer }> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 Landeed/2.0',
        'Accept': 'image/png,image/*;q=0.9,*/*;q=0.8'
      }
    });

    if (!res.ok) {
      return { ok: false };
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('image')) {
      return { ok: false };
    }

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (!isValidPng(buffer)) {
      return { ok: false };
    }

    return { ok: true, buffer };
  } catch (_e) {
    return { ok: false };
  }
}

// ============================================================================
// ROUTE HANDLERS
// ============================================================================

// Diagnostic & Health endpoint
tilesRouter.get('/health', (_req: Request, res: Response): void => {
  res.json({
    status: 'ok',
    service: 'Landeed WMS Tile Proxy',
    memoryCacheCount: memoryCache.size,
    diskCacheDir: CACHE_DIR,
    supportedStates: Object.keys(STATE_WMS_REGISTRY)
  });
});

// Primary Tile Proxy endpoint: GET /api/tiles/wms/:state/:z/:x/:y
tilesRouter.get('/wms/:state/:z/:x/:y', async (req: Request, res: Response): Promise<void> => {
  try {
    const { state, z, x, y } = req.params;
    const zoom = parseInt(z, 10);
    const tileX = parseInt(x, 10);
    const tileY = parseInt(y, 10);
    const forceRefresh = req.query.refresh === 'true';
    const customLayers = typeof req.query.layers === 'string' ? req.query.layers.replace(/[\r\n\t]/g, '') : undefined;

    // Validate and sanitize state parameter
    const rawState = String(state || '').trim();
    const isValidState = /^[A-Za-z0-9_-]{2,10}$/.test(rawState);
    const cleanState = rawState.replace(/[\r\n\t]/g, '').toUpperCase();
    const normState = isValidState ? cleanState : 'DEFAULT';

    // Universal headers (sanitized against control chars / CRLF)
    const safeZ = String(z || '').replace(/[\r\n\t]/g, '');
    const safeX = String(x || '').replace(/[\r\n\t]/g, '');
    const safeY = String(y || '').replace(/[\r\n\t]/g, '');
    const safeStateHeader = normState.replace(/[\r\n\t]/g, '');

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('X-Tile-Coords', `${safeZ}/${safeX}/${safeY}`);
    res.setHeader('X-State', safeStateHeader);

    // If invalid state string format, fallback safely to transparent PNG
    if (!isValidState) {
      res.setHeader('X-Cache', 'FALLBACK-TRANSPARENT');
      res.setHeader('Cache-Control', 'no-cache');
      res.status(200).send(TRANSPARENT_256_PNG);
      return;
    }

    // Input sanitization & coordinates boundary check
    const numTiles = Math.pow(2, zoom);
    if (
      isNaN(zoom) ||
      isNaN(tileX) ||
      isNaN(tileY) ||
      zoom < 0 ||
      zoom > 24 ||
      tileX < 0 ||
      tileX >= numTiles ||
      tileY < 0 ||
      tileY >= numTiles
    ) {
      res.setHeader('X-Cache', 'FALLBACK-TRANSPARENT');
      res.setHeader('Cache-Control', 'no-cache');
      res.status(200).send(TRANSPARENT_256_PNG);
      return;
    }

    const safeState = path.basename(normState).replace(/[^A-Za-z0-9_-]/g, '') || 'DEFAULT';
    const stateCacheDir = path.join(CACHE_DIR, safeState);
    const resolvedCacheDir = path.resolve(CACHE_DIR);

    // Ensure state cache path is strictly inside CACHE_DIR
    if (!path.resolve(stateCacheDir).startsWith(resolvedCacheDir)) {
      res.setHeader('X-Cache', 'FALLBACK-TRANSPARENT');
      res.setHeader('Cache-Control', 'no-cache');
      res.status(200).send(TRANSPARENT_256_PNG);
      return;
    }

    const cacheKey = `${normState}_${zoom}_${tileX}_${tileY}${customLayers ? `_${customLayers}` : ''}`;
    const diskPath = path.join(stateCacheDir, `${zoom}`, `${tileX}`, `${tileY}.png`);
    if (!path.resolve(diskPath).startsWith(resolvedCacheDir)) {
      res.setHeader('X-Cache', 'FALLBACK-TRANSPARENT');
      res.setHeader('Cache-Control', 'no-cache');
      res.status(200).send(TRANSPARENT_256_PNG);
      return;
    }

    // 1. Tier 1: In-Memory LRU Cache
    if (!forceRefresh) {
      const memBuffer = memoryCache.get(cacheKey);
      if (memBuffer) {
        res.setHeader('X-Cache', 'HIT-MEMORY');
        res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
        res.status(200).send(memBuffer);
        return;
      }

      // 2. Tier 2: Filesystem Disk Cache
      if (fs.existsSync(diskPath)) {
        try {
          const diskBuffer = await fs.promises.readFile(diskPath);
          if (isValidPng(diskBuffer)) {
            memoryCache.set(cacheKey, diskBuffer);
            res.setHeader('X-Cache', 'HIT-DISK');
            res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
            res.status(200).send(diskBuffer);
            return;
          }
        } catch (_readErr) {
          // Proceed to upstream fetch on disk read failure
        }
      }
    }

    // 3. Upstream Fetch
    const config = getStateConfig(normState);
    const bbox = tileToEPSG3857BBox(tileX, tileY, zoom);
    const layers = customLayers || config.layers;

    const wmsParams = new URLSearchParams({
      SERVICE: 'WMS',
      VERSION: config.version,
      REQUEST: 'GetMap',
      LAYERS: layers,
      STYLES: '',
      SRS: 'EPSG:3857',
      BBOX: bbox.bboxString,
      WIDTH: '256',
      HEIGHT: '256',
      FORMAT: 'image/png',
      TRANSPARENT: 'TRUE'
    });

    const primaryUrl = `${config.wmsBaseUrl}?${wmsParams.toString()}`;
    let fetchResult = await fetchUpstreamTile(primaryUrl, 4000);

    // If primary fails and backupUrl exists, attempt backup (e.g. ISRO Bhuvan)
    if (!fetchResult.ok && config.backupUrl) {
      const backupParams = new URLSearchParams({
        SERVICE: 'WMS',
        VERSION: '1.1.1',
        REQUEST: 'GetMap',
        LAYERS: config.backupLayers || layers,
        STYLES: '',
        SRS: 'EPSG:3857',
        BBOX: bbox.bboxString,
        WIDTH: '256',
        HEIGHT: '256',
        FORMAT: 'image/png',
        TRANSPARENT: 'TRUE'
      });
      const backupUrl = `${config.backupUrl}?${backupParams.toString()}`;
      fetchResult = await fetchUpstreamTile(backupUrl, 3000);
    }

    // Upstream fetch succeeded with a verified PNG image
    if (fetchResult.ok && fetchResult.buffer) {
      const validBuffer = fetchResult.buffer;
      memoryCache.set(cacheKey, validBuffer);

      // Asynchronously write to disk cache without blocking response
      fs.promises
        .mkdir(path.dirname(diskPath), { recursive: true })
        .then(() => fs.promises.writeFile(diskPath, validBuffer))
        .catch((err) => console.warn('[TileProxy] Disk write warning:', err.message));

      res.setHeader('X-Cache', 'MISS-UPSTREAM');
      res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
      res.status(200).send(validBuffer);
      return;
    }

    // 4. Graceful Fallback Buffer (Guaranteed HTTP 200, Content-Type: image/png)
    memoryCache.set(cacheKey, TRANSPARENT_256_PNG);
    res.setHeader('X-Cache', 'FALLBACK-TRANSPARENT');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.status(200).send(TRANSPARENT_256_PNG);
  } catch (err: any) {
    console.warn('[TileProxy] Route error fallback:', err?.message || err);
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader('X-Cache', 'FALLBACK-ERROR');
      res.status(200).send(TRANSPARENT_256_PNG);
    }
  }
});
