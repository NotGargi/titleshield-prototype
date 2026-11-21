import { API_BASE_URL } from '../constants/api';
/**
 * Web Mercator (EPSG:3857) Geodesic Projection Math & Slippy Tile Calculations
 * with Live NIC BhuNaksha Official State WMS Cadastral Layer Integration.
 * 
 * Accurately translates geographic coordinates (WGS84 Lat/Lng) to pixel coordinates
 * in a local map viewport, and provides slippy tile grid computation for Esri, OSM,
 * and Official State WMS Cadastral Servers (Maharashtra MahaBhumi, UP BhuNaksha,
 * Karnataka Bhoomi/KSRSAC, MP BhuNaksha, Rajasthan Apna Khata, and ISRO Bhuvan).
 */

import {
  StateWmsConfig,
  OFFICIAL_STATE_WMS_REGISTRY,
  getStateWmsConfig
} from '../constants/stateWmsRegistry';

export {
  StateWmsConfig,
  OFFICIAL_STATE_WMS_REGISTRY,
  getStateWmsConfig
};

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface BoundingBox3857 {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  bboxString: string; // "minX,minY,maxX,maxY"
}

export interface BoundingBox4326 {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
  bboxString111: string; // "minLng,minLat,maxLng,maxLat" (WMS 1.1.1)
  bboxString130: string; // "minLat,minLng,maxLat,maxLng" (WMS 1.3.0)
}

export interface SlippyTile {
  key: string;
  x: number; // tile X coordinate
  y: number; // tile Y coordinate
  z: number; // zoom level
  px: number; // viewport pixel offset X (left)
  py: number; // viewport pixel offset Y (top)
  size: number; // tile size in px (usually 256)
  satelliteUrl: string;
  cadastralUrl: string;
  wmsCadastralUrl?: string; // Official live state WMS BhuNaksha GetMap tile URL
  wmsBbox?: string;        // Formatted EPSG:3857 BBOX query string
  stateCode?: string;      // Resolved Indian state jurisdiction
}

export const TILE_PROVIDERS = {
  satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  cadastral: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  wms: 'OFFICIAL_STATE_WMS',
  wms_cadastral: 'OFFICIAL_STATE_WMS'
} as const;

export type TileProviderType = 'satellite' | 'cadastral' | 'wms' | 'wms_cadastral';

// Radius of Earth in meters for EPSG:3857 Spherical Mercator
export const EARTH_RADIUS_METERS = 6378137.0;
export const MAX_MERCATOR_EXTENT = Math.PI * EARTH_RADIUS_METERS; // 20037508.342789244

/**
 * Heuristically detects the Indian state from a geographic coordinate (Lat/Lng)
 * to automatically route live WMS requests when state context is not explicitly passed.
 */
export function detectStateFromCoordinates(lat: number, lng: number): string {
  // Delhi NCT (Yamuna boundary at ~77.33 E)
  if (lat >= 28.40 && lat <= 28.88 && lng >= 76.84 && lng <= 77.33) return 'DL';
  // Telangana
  if (lat >= 15.8 && lat <= 19.9 && lng >= 77.8 && lng <= 81.8) return 'TG';
  // Karnataka
  if (lat >= 11.5 && lat <= 18.5 && lng >= 74.0 && lng <= 77.8) return 'KA';
  // Tamil Nadu
  if (lat >= 8.0 && lat <= 13.6 && lng >= 76.2 && lng <= 80.4) return 'TN';
  // Maharashtra
  if (lat >= 15.6 && lat <= 22.0 && lng >= 72.6 && lng <= 80.9) return 'MH';
  // Uttar Pradesh
  if (lat >= 23.8 && lat <= 31.4 && lng >= 77.0 && lng <= 84.7) return 'UP';
  // Madhya Pradesh
  if (lat >= 21.0 && lat <= 26.9 && lng >= 74.0 && lng <= 82.8) return 'MP';
  // Rajasthan
  if (lat >= 23.0 && lat <= 30.2 && lng >= 69.5 && lng <= 78.3) return 'RJ';

  return 'DEFAULT';
}

/**
 * Computes the exact EPSG:3857 (Spherical Mercator) metric BBOX for a given slippy tile.
 * Used for standards-compliant OGC WMS GetMap queries.
 */
export function tileToEPSG3857BBox(x: number, y: number, z: number): BoundingBox3857 {
  const numTiles = Math.pow(2, z);
  const tileSize = (2 * MAX_MERCATOR_EXTENT) / numTiles;
  const minX = -MAX_MERCATOR_EXTENT + x * tileSize;
  const maxX = -MAX_MERCATOR_EXTENT + (x + 1) * tileSize;
  const maxY = MAX_MERCATOR_EXTENT - y * tileSize;
  const minY = MAX_MERCATOR_EXTENT - (y + 1) * tileSize;

  const minXStr = minX.toFixed(2);
  const minYStr = minY.toFixed(2);
  const maxXStr = maxX.toFixed(2);
  const maxYStr = maxY.toFixed(2);

  return {
    minX,
    minY,
    maxX,
    maxY,
    bboxString: `${minXStr},${minYStr},${maxXStr},${maxYStr}`
  };
}

/**
 * Computes the EPSG:4326 (WGS84 degrees) BBOX for a given slippy tile.
 * Formats for both WMS 1.1.1 (lng/lat) and WMS 1.3.0 (lat/lng) specifications.
 */
export function tileToEPSG4326BBox(x: number, y: number, z: number): BoundingBox4326 {
  const numTiles = Math.pow(2, z);
  const minLng = (x / numTiles) * 360 - 180;
  const maxLng = ((x + 1) / numTiles) * 360 - 180;

  const nTop = Math.PI - (2 * Math.PI * y) / numTiles;
  const maxLat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(nTop) - Math.exp(-nTop)));

  const nBottom = Math.PI - (2 * Math.PI * (y + 1)) / numTiles;
  const minLat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(nBottom) - Math.exp(-nBottom)));

  return {
    minLat,
    minLng,
    maxLat,
    maxLng,
    bboxString111: `${minLng.toFixed(6)},${minLat.toFixed(6)},${maxLng.toFixed(6)},${maxLat.toFixed(6)}`,
    bboxString130: `${minLat.toFixed(6)},${minLng.toFixed(6)},${maxLat.toFixed(6)},${maxLng.toFixed(6)}`
  };
}



/**
 * Constructs an authentic OGC WMS GetMap tile URL for the specified state and tile coordinate.
 * Routes via the backend proxy server to avoid browser CORS and IP restrictions.
 */
export function getWmsCadastralTileUrl(
  stateCode: string,
  z: number,
  x: number,
  y: number,
  _isVillageBoundary = false
): string {
  const cleanState = (stateCode || 'MH').toUpperCase();
  return `${API_BASE_URL}/tiles/wms/${cleanState}/${z}/${x}/${y}`;
}

/**
 * Returns the formatted tile URL for a given provider and slippy tile coordinate.
 * Note: Esri World Imagery uses {z}/{y}/{x} (Level/Row/Col).
 *       OpenStreetMap uses {z}/{x}/{y}.png.
 *       WMS Cadastral builds standard OGC GetMap request.
 */
export function getTileUrl(
  provider: TileProviderType,
  z: number,
  x: number,
  y: number,
  stateCode?: string
): string {
  if (provider === 'satellite') {
    return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;
  }
  if (provider === 'wms' || provider === 'wms_cadastral') {
    return getWmsCadastralTileUrl(stateCode || 'MH', z, x, y);
  }
  return `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
}

/**
 * Projects a WGS84 (Lat, Lng) coordinate to container viewport pixels (x, y)
 * relative to the center coordinate at a given zoom level.
 */
export function geoToPixel(
  lat: number,
  lng: number,
  zoom: number,
  centerLat: number,
  centerLng: number,
  mapWidth: number,
  mapHeight: number
): { x: number; y: number } {
  const scale = 256 * Math.pow(2, zoom);

  // Center projected world coordinates
  const centerWorldX = ((centerLng + 180) / 360) * scale;
  const sinCenterLat = Math.max(-0.9999, Math.min(0.9999, Math.sin((centerLat * Math.PI) / 180)));
  const centerWorldY = (0.5 - Math.log((1 + sinCenterLat) / (1 - sinCenterLat)) / (4 * Math.PI)) * scale;

  // Point projected world coordinates
  const pointWorldX = ((lng + 180) / 360) * scale;
  const sinLat = Math.max(-0.9999, Math.min(0.9999, Math.sin((lat * Math.PI) / 180)));
  const pointWorldY = (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale;

  // Viewport pixel coordinates centered on (mapWidth / 2, mapHeight / 2)
  const x = mapWidth / 2 + (pointWorldX - centerWorldX);
  const y = mapHeight / 2 + (pointWorldY - centerWorldY);

  return { x, y };
}

/**
 * Inverts container viewport pixel coordinates (x, y) back to geographic WGS84 (Lat, Lng).
 */
export function pixelToGeo(
  x: number,
  y: number,
  zoom: number,
  centerLat: number,
  centerLng: number,
  mapWidth: number,
  mapHeight: number
): GeoPoint {
  const scale = 256 * Math.pow(2, zoom);

  // Center world coordinates
  const centerWorldX = ((centerLng + 180) / 360) * scale;
  const sinCenterLat = Math.max(-0.9999, Math.min(0.9999, Math.sin((centerLat * Math.PI) / 180)));
  const centerWorldY = (0.5 - Math.log((1 + sinCenterLat) / (1 - sinCenterLat)) / (4 * Math.PI)) * scale;

  // Recover point world coordinates
  const pointWorldX = centerWorldX + (x - mapWidth / 2);
  const pointWorldY = centerWorldY + (y - mapHeight / 2);

  // Convert to degrees
  const lng = (pointWorldX / scale) * 360 - 180;
  const yNorm = 0.5 - pointWorldY / scale;
  const latRad = 2 * Math.atan(Math.exp(2 * Math.PI * yNorm)) - Math.PI / 2;
  const lat = (latRad * 180) / Math.PI;

  return {
    lat: Math.max(-85.05112878, Math.min(85.05112878, lat)),
    lng: Math.max(-180, Math.min(180, lng))
  };
}

/**
 * Computes all visible slippy map tiles for the current viewport center and zoom.
 * Returns an array of tiles with their grid coordinates, pixel offsets, tile URLs,
 * and live official state WMS BhuNaksha URLs.
 */
export function getVisibleTiles(
  centerLat: number,
  centerLng: number,
  zoom: number,
  mapWidth: number,
  mapHeight: number,
  stateCode?: string
): SlippyTile[] {
  // Secure input sanitization
  if (isNaN(centerLat) || isNaN(centerLng) || isNaN(zoom) || isNaN(mapWidth) || isNaN(mapHeight)) {
    return [];
  }

  const intZoom = Math.max(1, Math.min(19, Math.round(zoom)));
  const numTiles = Math.pow(2, intZoom);
  const scale = 256 * numTiles;

  // Center world coordinates
  const centerWorldX = ((centerLng + 180) / 360) * scale;
  const sinCenterLat = Math.max(-0.9999, Math.min(0.9999, Math.sin((centerLat * Math.PI) / 180)));
  const centerWorldY = (0.5 - Math.log((1 + sinCenterLat) / (1 - sinCenterLat)) / (4 * Math.PI)) * scale;

  const centerTileX = centerWorldX / 256;
  const centerTileY = centerWorldY / 256;

  // Guard against non-positive viewport dimensions
  const safeWidth = Math.max(1, mapWidth);
  const safeHeight = Math.max(1, mapHeight);

  // Buffer margin to ensure complete viewport coverage during pan/zoom
  const tilesAcross = Math.ceil(safeWidth / 256) + 2;
  const tilesDown = Math.ceil(safeHeight / 256) + 2;

  const minTileX = Math.floor(centerTileX - tilesAcross / 2);
  const maxTileX = Math.floor(centerTileX + tilesAcross / 2);
  const minTileY = Math.floor(centerTileY - tilesDown / 2);
  const maxTileY = Math.floor(centerTileY + tilesDown / 2);

  // Detect state if not explicitly passed
  const activeState = stateCode || detectStateFromCoordinates(centerLat, centerLng);

  const tiles: SlippyTile[] = [];

  for (let tx = minTileX; tx <= maxTileX; tx++) {
    for (let ty = minTileY; ty <= maxTileY; ty++) {
      if (ty < 0 || ty >= numTiles) continue;

      const wrappedX = ((tx % numTiles) + numTiles) % numTiles;
      const px = Math.round(safeWidth / 2 + (tx - centerTileX) * 256);
      const py = Math.round(safeHeight / 2 + (ty - centerTileY) * 256);

      const bbox3857 = tileToEPSG3857BBox(wrappedX, ty, intZoom);
      const wmsUrl = getWmsCadastralTileUrl(activeState, intZoom, wrappedX, ty);

      tiles.push({
        key: `${intZoom}_${tx}_${ty}`,
        x: wrappedX,
        y: ty,
        z: intZoom,
        px,
        py,
        size: 256,
        satelliteUrl: getTileUrl('satellite', intZoom, wrappedX, ty),
        cadastralUrl: getTileUrl('cadastral', intZoom, wrappedX, ty),
        wmsCadastralUrl: wmsUrl,
        wmsBbox: bbox3857.bboxString,
        stateCode: activeState
      });
    }
  }

  return tiles;
}
