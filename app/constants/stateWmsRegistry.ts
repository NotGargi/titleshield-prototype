/**
 * Official Indian State Revenue & Cadastral GIS (WMS / GeoServer) Registry
 * 
 * Maps Indian states to their authoritative state revenue GIS servers (NIC BhuNaksha,
 * MahaBhumi, KSRSAC KGIS Bhoomi, UP BhuNaksha, Apna Khata, etc.) and sovereign ISRO Bhuvan.
 */

export interface StateWmsConfig {
  stateCode: string;
  stateName: string;
  department: string;
  portalUrl: string;
  wmsBaseUrl: string;
  layers: string;
  villageLayer?: string;
  version: '1.1.1' | '1.3.0';
  crs: 'EPSG:3857' | 'EPSG:4326';
  format: string;
  transparent: boolean;
  minZoom: number;
  maxZoom: number;
  attribution: string;
  backupUrl?: string;
  backupLayers?: string;
}

export const OFFICIAL_STATE_WMS_REGISTRY: Record<string, StateWmsConfig> = {
  MH: {
    stateCode: 'MH',
    stateName: 'Maharashtra',
    department: 'Revenue & Forest Department / MahaBhumi (MahaBhuNaksha)',
    portalUrl: 'https://mahabhunakasha.mahabhumi.gov.in/',
    wmsBaseUrl: 'https://mahabhunakasha.mahabhumi.gov.in/geoserver/wms',
    layers: 'mahabhunaksha:cadastral_parcels',
    villageLayer: 'mahabhunaksha:village_boundary',
    version: '1.1.1',
    crs: 'EPSG:3857',
    format: 'image/png',
    transparent: true,
    minZoom: 14,
    maxZoom: 20,
    attribution: 'Government of Maharashtra (MahaBhumi / MahaBhuNaksha)',
    backupUrl: 'https://bhuvan-vec1.nrsc.gov.in/bhuvan/wms',
    backupLayers: 'cadastral:MH_Cad'
  },
  UP: {
    stateCode: 'UP',
    stateName: 'Uttar Pradesh',
    department: 'Board of Revenue, UP (UP Bhulekh / UP BhuNaksha)',
    portalUrl: 'https://upbhunaksha.gov.in/',
    wmsBaseUrl: 'https://upbhunaksha.gov.in/geoserver/wms',
    layers: 'upbhunaksha:khasra_parcels',
    villageLayer: 'upbhunaksha:village_map',
    version: '1.1.1',
    crs: 'EPSG:3857',
    format: 'image/png',
    transparent: true,
    minZoom: 14,
    maxZoom: 20,
    attribution: 'Government of Uttar Pradesh (UP Bhulekh / BhuNaksha)',
    backupUrl: 'https://bhuvan-vec1.nrsc.gov.in/bhuvan/wms',
    backupLayers: 'cadastral:UP_Cad'
  },
  KA: {
    stateCode: 'KA',
    stateName: 'Karnataka',
    department: 'Survey Settlement & Land Records (SSLR) & KSRSAC (Bhoomi / KGIS)',
    portalUrl: 'https://kgis.ksrsac.in/',
    wmsBaseUrl: 'https://kgis.ksrsac.in/geoserver/wms',
    layers: 'kgis:cadastral_survey_boundaries',
    villageLayer: 'kgis:revenue_villages',
    version: '1.1.1',
    crs: 'EPSG:3857',
    format: 'image/png',
    transparent: true,
    minZoom: 14,
    maxZoom: 20,
    attribution: 'Government of Karnataka (KSRSAC / Bhoomi KGIS)',
    backupUrl: 'https://bhuvan-vec1.nrsc.gov.in/bhuvan/wms',
    backupLayers: 'cadastral:KA_Cad'
  },
  MP: {
    stateCode: 'MP',
    stateName: 'Madhya Pradesh',
    department: 'Revenue Department, Madhya Pradesh (MP Bhulekh / BhuNaksha)',
    portalUrl: 'https://mpbhulekh.gov.in/',
    wmsBaseUrl: 'https://mpbhunaksha.nic.in/geoserver/wms',
    layers: 'mpbhunaksha:khasra_boundaries',
    villageLayer: 'mpbhunaksha:village_map',
    version: '1.1.1',
    crs: 'EPSG:3857',
    format: 'image/png',
    transparent: true,
    minZoom: 14,
    maxZoom: 20,
    attribution: 'Government of Madhya Pradesh (MP Bhulekh / BhuNaksha)',
    backupUrl: 'https://bhuvan-vec1.nrsc.gov.in/bhuvan/wms',
    backupLayers: 'cadastral:MP_Cad'
  },
  RJ: {
    stateCode: 'RJ',
    stateName: 'Rajasthan',
    department: 'Board of Revenue for Rajasthan (Apna Khata / BhuNaksha)',
    portalUrl: 'https://bhunaksha.rajasthan.gov.in/',
    wmsBaseUrl: 'https://bhunaksha.rajasthan.gov.in/geoserver/wms',
    layers: 'rajbhunaksha:khasra_parcels',
    villageLayer: 'rajbhunaksha:village_boundary',
    version: '1.1.1',
    crs: 'EPSG:3857',
    format: 'image/png',
    transparent: true,
    minZoom: 14,
    maxZoom: 20,
    attribution: 'Government of Rajasthan (Apna Khata / BhuNaksha)',
    backupUrl: 'https://bhuvan-vec1.nrsc.gov.in/bhuvan/wms',
    backupLayers: 'cadastral:RJ_Cad'
  },
  TG: {
    stateCode: 'TG',
    stateName: 'Telangana',
    department: 'Chief Commissioner of Land Administration (Dharani Portal)',
    portalUrl: 'https://dharani.telangana.gov.in/',
    wmsBaseUrl: 'https://dharani.telangana.gov.in/geoserver/wms',
    layers: 'dharani:survey_parcels',
    villageLayer: 'dharani:revenue_villages',
    version: '1.1.1',
    crs: 'EPSG:3857',
    format: 'image/png',
    transparent: true,
    minZoom: 14,
    maxZoom: 20,
    attribution: 'Government of Telangana (Dharani Integrated Cadastre)',
    backupUrl: 'https://bhuvan-vec1.nrsc.gov.in/bhuvan/wms',
    backupLayers: 'cadastral:TG_Cad'
  },
  TN: {
    stateCode: 'TN',
    stateName: 'Tamil Nadu',
    department: 'Department of Survey and Settlement (Tamil Nilam FMB Cadastre)',
    portalUrl: 'https://eservices.tn.gov.in/',
    wmsBaseUrl: 'https://eservices.tn.gov.in/geoserver/wms',
    layers: 'tn_survey:fmb_sketch_parcels',
    villageLayer: 'tn_survey:village_boundaries',
    version: '1.1.1',
    crs: 'EPSG:3857',
    format: 'image/png',
    transparent: true,
    minZoom: 14,
    maxZoom: 20,
    attribution: 'Government of Tamil Nadu (Tamil Nilam FMB Cadastre)',
    backupUrl: 'https://bhuvan-vec1.nrsc.gov.in/bhuvan/wms',
    backupLayers: 'cadastral:TN_Cad'
  },
  DL: {
    stateCode: 'DL',
    stateName: 'Delhi',
    department: 'Government of NCT of Delhi / Delhi GeoSpatial (GSDL)',
    portalUrl: 'https://gsdl.delhi.gov.in/',
    wmsBaseUrl: 'https://gsdl.delhi.gov.in/geoserver/wms',
    layers: 'gsdl:cadastral_khasra_parcels',
    villageLayer: 'gsdl:revenue_villages',
    version: '1.1.1',
    crs: 'EPSG:3857',
    format: 'image/png',
    transparent: true,
    minZoom: 14,
    maxZoom: 20,
    attribution: 'Government of NCT of Delhi (GSDL Cadastre)',
    backupUrl: 'https://bhuvan-vec1.nrsc.gov.in/bhuvan/wms',
    backupLayers: 'cadastral:DL_Cad'
  },
  DEFAULT: {
    stateCode: 'IN',
    stateName: 'Pan-India',
    department: 'National Remote Sensing Centre (NRSC) / ISRO (Bhuvan OGC Cadastre)',
    portalUrl: 'https://bhuvan.nrsc.gov.in/',
    wmsBaseUrl: 'https://bhuvan-vec1.nrsc.gov.in/bhuvan/wms',
    layers: 'cadastral:cadastral_india',
    villageLayer: 'india3:revenue_villages',
    version: '1.1.1',
    crs: 'EPSG:3857',
    format: 'image/png',
    transparent: true,
    minZoom: 13,
    maxZoom: 20,
    attribution: 'National Remote Sensing Centre (NRSC) / ISRO Bhuvan',
    backupUrl: 'https://bhuvan-vec2.nrsc.gov.in/bhuvan/wms',
    backupLayers: 'cadastral:cadastral_india'
  }
};

/**
 * Returns the StateWmsConfig for a given state code (e.g. 'MH', 'UP', 'KA').
 * Falls back cleanly to DEFAULT (Pan-India ISRO Bhuvan).
 */
export function getStateWmsConfig(stateCode?: string): StateWmsConfig {
  if (!stateCode) return OFFICIAL_STATE_WMS_REGISTRY.DEFAULT;
  const upper = stateCode.trim().toUpperCase();
  return OFFICIAL_STATE_WMS_REGISTRY[upper] || OFFICIAL_STATE_WMS_REGISTRY.DEFAULT;
}
