const fs = require('fs');
const path = require('path');
const { createShapefileBuffers, latLngToUtm } = require('../dist/services/cadastreIngest');

// Target Directories
const DATA_DIR = path.resolve(__dirname, '../../data/samples/cadastre');
const SHP_DIR = path.join(DATA_DIR, 'shapefiles');
const SERVER_DATA_DIR = path.resolve(__dirname, '../data/samples/cadastre');
const SERVER_SHP_DIR = path.join(SERVER_DATA_DIR, 'shapefiles');

[DATA_DIR, SHP_DIR, SERVER_DATA_DIR, SERVER_SHP_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

console.log('Generating authentic cadastral datasets for Landeed 2.0...');

/**
 * 1. HAVELI TALUKA, PUNE (MAHARASHTRA)
 * Center: Wagholi (Lat: 18.5793, Lng: 73.9823)
 * Coordinate Reference System: WGS84 UTM Zone 43N
 */
const haveliParcels = [];
const haveliOwners = [
  'Ramesh Kulkarni', 'Suresh Patil', 'Vasantrao Deshmukh', 'Ananda Jagtap',
  'Dattatray Shinde', 'Babanrao Waghmare', 'Santosh Gaikwad', 'Pandurang More',
  'Eknath Jadhav', 'Sambhaji Bhosale', 'Kashinath Pawar', 'Namdeo Chavan',
  'Tukaram Salunke', 'Balasaheb Kadam', 'Vitthal Mohite', 'Ashok Sawant',
  'Chandrakant Mane', 'Ganpatrao Thorat', 'Haribhau Ghadge', 'Kisanrao Nalawade'
];

const puneCenterLat = 18.5793;
const puneCenterLng = 73.9823;
const delta = 0.0018; // ~200 meters per parcel

let idx = 0;
// Create an 8x8 grid = 64 cadastral parcels in Wagholi
for (let row = -4; row < 4; row++) {
  for (let col = -4; col < 4; col++) {
    const lat0 = Number((puneCenterLat + row * delta).toFixed(6));
    const lng0 = Number((puneCenterLng + col * delta).toFixed(6));
    const lat1 = Number((lat0 + delta * 0.92).toFixed(6));
    const lng1 = Number((lng0 + delta * 0.92).toFixed(6));

    let surveyNumber = `${140 + idx}`;
    let subDivision = '';
    let owner = haveliOwners[idx % haveliOwners.length];
    let extent = `${(1.1 + (idx % 7) * 0.35).toFixed(2)} Acres`;
    let landType = (idx % 5 === 0) ? 'Residential Freehold' : (idx % 7 === 0) ? 'Commercial Freehold' : 'Agricultural Freehold';
    let guidanceValue = `₹${45 + (idx % 12) * 5},00,000`;
    let marketValue = `₹${65 + (idx % 15) * 6},00,000`;

    // Ensure benchmark parcels match exact frontend IDs
    if (row === 0 && col === 0) {
      surveyNumber = '142';
      subDivision = '2A';
      owner = 'Ramesh Kulkarni';
      extent = '1.25 Acres';
      landType = 'Agricultural Freehold';
      guidanceValue = '₹48,00,000';
      marketValue = '₹72,00,000';
    } else if (row === 0 && col === 1) {
      surveyNumber = '142';
      subDivision = '2B';
      owner = 'Suresh Patil';
      extent = '1.10 Acres';
      landType = 'Agricultural Freehold';
      guidanceValue = '₹42,00,000';
      marketValue = '₹65,00,000';
    } else if (row === -1 && col === 0) {
      surveyNumber = '141';
      subDivision = '';
      owner = 'Vasantrao Deshmukh';
      extent = '2.50 Acres';
      landType = 'Residential Freehold';
      guidanceValue = '₹95,00,000';
      marketValue = '₹1,40,00,000';
    } else if (row === 1 && col === 0) {
      surveyNumber = '143';
      subDivision = '';
      owner = 'Ananda Jagtap';
      extent = '3.20 Acres';
      landType = 'Agricultural Freehold';
      guidanceValue = '₹58,00,000';
      marketValue = '₹82,00,000';
    }

    // Polygon coordinates [lat, lng]
    const polygon = [
      [lat0, lng0],
      [lat1, lng0],
      [lat1, lng1],
      [lat0, lng1],
      [lat0, lng0]
    ];

    haveliParcels.push({
      surveyNumber: subDivision ? `${surveyNumber}/${subDivision}` : surveyNumber,
      subDivision,
      owner,
      extent,
      landType,
      village: 'Wagholi',
      taluka: 'Haveli',
      district: 'Pune',
      state: 'MH',
      guidanceValueInr: guidanceValue,
      marketValueInr: marketValue,
      polygon
    });

    idx++;
  }
}

// 1A. Build GeoJSON for Haveli Wagholi
const haveliGeoJson = {
  type: 'FeatureCollection',
  name: 'haveli_wagholi_cadastre',
  crs: {
    type: 'name',
    properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' }
  },
  features: haveliParcels.map((p, i) => ({
    type: 'Feature',
    id: `parcel_mh_haveli_wagholi_${p.surveyNumber.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`,
    properties: {
      SURVEY_NO: p.surveyNumber,
      SUB_DIV: p.subDivision,
      GAT_NO: p.surveyNumber,
      OWNER: p.owner,
      AREA_ACRE: p.extent,
      EXTENT: p.extent,
      LAND_USE: p.landType,
      LAND_TYPE: p.landType,
      VILLAGE: p.village,
      TALUKA: p.taluka,
      DISTRICT: p.district,
      STATE: p.state,
      GUIDANCE_VAL: p.guidanceValueInr,
      MARKET_VAL: p.marketValueInr,
      CLEAN_TITLE_SCORE: 92 + (i % 8),
      STATUS: 'CLEAN'
    },
    geometry: {
      type: 'Polygon',
      // GeoJSON standard: [lng, lat]
      coordinates: [p.polygon.map(([lat, lng]) => [lng, lat])]
    }
  }))
};

const haveliGeoJsonPath = path.join(DATA_DIR, 'haveli_wagholi_cadastre.geojson');
fs.writeFileSync(haveliGeoJsonPath, JSON.stringify(haveliGeoJson, null, 2), 'utf8');
fs.writeFileSync(path.join(SERVER_DATA_DIR, 'haveli_wagholi_cadastre.geojson'), JSON.stringify(haveliGeoJson, null, 2), 'utf8');
console.log(`Saved Haveli GeoJSON (${haveliParcels.length} features): ${haveliGeoJsonPath}`);

// 1B. Build Shapefile for Haveli Taluka (UTM Zone 43N)
const haveliShpBuffers = createShapefileBuffers(haveliParcels, 43);
fs.writeFileSync(path.join(SHP_DIR, 'haveli_taluka.shp'), haveliShpBuffers.shpBuf);
fs.writeFileSync(path.join(SHP_DIR, 'haveli_taluka.dbf'), haveliShpBuffers.dbfBuf);
fs.writeFileSync(path.join(SHP_DIR, 'haveli_taluka.shx'), haveliShpBuffers.shxBuf);
fs.writeFileSync(path.join(SHP_DIR, 'haveli_taluka.prj'), haveliShpBuffers.prjContent);

fs.writeFileSync(path.join(SERVER_SHP_DIR, 'haveli_taluka.shp'), haveliShpBuffers.shpBuf);
fs.writeFileSync(path.join(SERVER_SHP_DIR, 'haveli_taluka.dbf'), haveliShpBuffers.dbfBuf);
fs.writeFileSync(path.join(SERVER_SHP_DIR, 'haveli_taluka.shx'), haveliShpBuffers.shxBuf);
fs.writeFileSync(path.join(SERVER_SHP_DIR, 'haveli_taluka.prj'), haveliShpBuffers.prjContent);
console.log(`Saved Haveli Shapefile bundle (UTM Zone 43N, ${haveliParcels.length} records) to ${SHP_DIR}`);


/**
 * 2. SAHIBABAD TEHSIL, GHAZIABAD (UTTAR PRADESH)
 * Center: Panchsheel Park, Sahibabad (Lat: 28.6712, Lng: 77.3653)
 * Coordinate Reference System: WGS84 UTM Zone 44N
 */
const upParcels = [];
const upOwners = [
  'Rajesh Sharma', 'Amit Kumar Gupta', 'Vikramaditya Tyagi', 'Sanjay Verma',
  'Pradeep Singhal', 'Mahesh Chandra Agarwal', 'Satish Yadav', 'Anil Kumar Bansal',
  'Dinesh Kashyap', 'Rajiv Saxena', 'Manoj Pathak', 'Sunil Kumar Mishra',
  'Pankaj Shrivastava', 'Vipin Goel', 'Ashish Rastogi', 'Neeraj Chaudhary'
];

const upCenterLat = 28.6712;
const upCenterLng = 77.3653;
const upDelta = 0.0016; // ~180 meters

let upIdx = 0;
// Create an 8x8 grid = 64 cadastral parcels in Sahibabad
for (let row = -4; row < 4; row++) {
  for (let col = -4; col < 4; col++) {
    const lat0 = Number((upCenterLat + row * upDelta).toFixed(6));
    const lng0 = Number((upCenterLng + col * upDelta).toFixed(6));
    const lat1 = Number((lat0 + upDelta * 0.90).toFixed(6));
    const lng1 = Number((lng0 + upDelta * 0.90).toFixed(6));

    let khasraNo = `${400 + upIdx}`;
    let plotNo = `Plot ${100 + upIdx}`;
    let owner = upOwners[upIdx % upOwners.length];
    let extent = `${(1800 + (upIdx % 10) * 200).toLocaleString('en-IN')} sq.ft`;
    let landType = (upIdx % 4 === 0) ? 'Commercial Freehold' : 'Residential Freehold';
    let guidanceValue = `₹${50 + (upIdx % 15) * 4},00,000`;
    let marketValue = `₹${80 + (upIdx % 15) * 6},00,000`;

    // Benchmark parcel matching rec-up-ghaziabad-panchsheel-112
    if (row === 0 && col === 0) {
      khasraNo = '112';
      plotNo = 'Plot 112';
      owner = 'Rajesh Sharma';
      extent = '2,400 sq.ft';
      landType = 'Residential Freehold';
      guidanceValue = '₹55,00,000';
      marketValue = '₹85,00,000';
    }

    const polygon = [
      [lat0, lng0],
      [lat1, lng0],
      [lat1, lng1],
      [lat0, lng1],
      [lat0, lng0]
    ];

    upParcels.push({
      surveyNumber: khasraNo,
      subDivision: plotNo,
      owner,
      extent,
      landType,
      village: 'Sahibabad',
      taluka: 'Sahibabad',
      district: 'Ghaziabad',
      state: 'UP',
      guidanceValueInr: guidanceValue,
      marketValueInr: marketValue,
      polygon
    });

    upIdx++;
  }
}

// 2A. Build GeoJSON for Sahibabad Ghaziabad
const upGeoJson = {
  type: 'FeatureCollection',
  name: 'sahibabad_ghaziabad_cadastre',
  crs: {
    type: 'name',
    properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' }
  },
  features: upParcels.map((p, i) => ({
    type: 'Feature',
    id: `parcel_up_sahibabad_sahibabad_${p.surveyNumber}`,
    properties: {
      KHASRA_NO: p.surveyNumber,
      PLOT_NO: p.subDivision,
      SURVEY_NO: p.surveyNumber,
      OWNER_NAME: p.owner,
      OWNER: p.owner,
      HOLDING_AREA: p.extent,
      EXTENT: p.extent,
      LAND_TYPE: p.landType,
      VILLAGE: p.village,
      TEHSIL: p.taluka,
      TALUKA: p.taluka,
      DISTRICT: p.district,
      STATE: p.state,
      GUIDANCE_VAL: p.guidanceValueInr,
      MARKET_VAL: p.marketValueInr,
      CLEAN_TITLE_SCORE: 90 + (i % 10),
      STATUS: 'CLEAN'
    },
    geometry: {
      type: 'Polygon',
      coordinates: [p.polygon.map(([lat, lng]) => [lng, lat])]
    }
  }))
};

const upGeoJsonPath = path.join(DATA_DIR, 'sahibabad_ghaziabad_cadastre.geojson');
fs.writeFileSync(upGeoJsonPath, JSON.stringify(upGeoJson, null, 2), 'utf8');
fs.writeFileSync(path.join(SERVER_DATA_DIR, 'sahibabad_ghaziabad_cadastre.geojson'), JSON.stringify(upGeoJson, null, 2), 'utf8');
console.log(`Saved Sahibabad GeoJSON (${upParcels.length} features): ${upGeoJsonPath}`);

// 2B. Build Shapefile for Sahibabad Tehsil (UTM Zone 44N)
const upShpBuffers = createShapefileBuffers(upParcels, 44);
fs.writeFileSync(path.join(SHP_DIR, 'sahibabad_tehsil.shp'), upShpBuffers.shpBuf);
fs.writeFileSync(path.join(SHP_DIR, 'sahibabad_tehsil.dbf'), upShpBuffers.dbfBuf);
fs.writeFileSync(path.join(SHP_DIR, 'sahibabad_tehsil.shx'), upShpBuffers.shxBuf);
fs.writeFileSync(path.join(SHP_DIR, 'sahibabad_tehsil.prj'), upShpBuffers.prjContent);

fs.writeFileSync(path.join(SERVER_SHP_DIR, 'sahibabad_tehsil.shp'), upShpBuffers.shpBuf);
fs.writeFileSync(path.join(SERVER_SHP_DIR, 'sahibabad_tehsil.dbf'), upShpBuffers.dbfBuf);
fs.writeFileSync(path.join(SERVER_SHP_DIR, 'sahibabad_tehsil.shx'), upShpBuffers.shxBuf);
fs.writeFileSync(path.join(SERVER_SHP_DIR, 'sahibabad_tehsil.prj'), upShpBuffers.prjContent);
console.log(`Saved Sahibabad Shapefile bundle (UTM Zone 44N, ${upParcels.length} records) to ${SHP_DIR}`);

console.log('✅ All bundled cadastral test datasets generated successfully!');
