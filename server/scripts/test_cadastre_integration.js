const { autoSeedCadastre, ingestShapefile, utmToLatLng, latLngToUtm } = require('../dist/services/cadastreIngest');
const { sqlite } = require('../dist/db');
const path = require('path');
const fs = require('fs');

console.log('Testing Cadastre Ingestion & Persistence Engine...');

// 1. Test auto-seeding
const seedRes = autoSeedCadastre();
console.log('AutoSeed results:', seedRes);

const countRow = sqlite.prepare('SELECT COUNT(*) as count FROM parcels').get();
console.log(`Total parcels in SQLite: ${countRow.count}`);

// 2. Test spatial bounding box query on Wagholi
const puneBbox = sqlite.prepare(`
  SELECT id, survey_number, village, centroid_lat, centroid_lng
  FROM parcels
  WHERE bbox_max_lat >= ? AND bbox_min_lat <= ?
    AND bbox_max_lng >= ? AND bbox_min_lng <= ?
`).all(18.57, 18.59, 73.97, 73.99);

console.log(`Spatial query for Wagholi returned ${puneBbox.length} parcels`);

// 3. Test survey number lookup
const parcel142 = sqlite.prepare(`
  SELECT * FROM parcels WHERE survey_number LIKE '142%'
`).all();
console.log(`Lookup for Gat 142 returned ${parcel142.length} records:`, parcel142.map(p => ({ id: p.id, survey: p.survey_number, owner: p.claimed_owner })));

// 4. Test Shapefile Ingestion of Sahibabad Shapefile
const shpPath = path.resolve(__dirname, '../../data/samples/cadastre/shapefiles/sahibabad_tehsil.shp');
const dbfPath = path.resolve(__dirname, '../../data/samples/cadastre/shapefiles/sahibabad_tehsil.dbf');
const prjPath = path.resolve(__dirname, '../../data/samples/cadastre/shapefiles/sahibabad_tehsil.prj');

if (fs.existsSync(shpPath) && fs.existsSync(dbfPath)) {
  const shpRes = ingestShapefile({
    shp: fs.readFileSync(shpPath),
    dbf: fs.readFileSync(dbfPath),
    prj: fs.readFileSync(prjPath, 'utf8')
  }, {
    datasetName: 'sahibabad_shapefile_import',
    defaultState: 'UP',
    defaultTaluka: 'Sahibabad',
    defaultVillage: 'Sahibabad',
    utmZone: 44
  });
  console.log(`Shapefile Ingestion: ${shpRes.count} records imported in ${shpRes.elapsedMs}ms!`);
}

// 5. Test Karney-Snyder forward & inverse round trip
const pLat = 18.5793, pLng = 73.9823;
const utm = latLngToUtm(pLat, pLng, 43);
const geo = utmToLatLng(utm.easting, utm.northing, 43);
const latErr = Math.abs(geo.lat - pLat);
const lngErr = Math.abs(geo.lng - pLng);
console.log(`UTM Roundtrip Precision Error: Lat=${latErr.toExponential(3)}, Lng=${lngErr.toExponential(3)}`);

if (countRow.count >= 64 && puneBbox.length > 0 && latErr < 1e-6) {
  console.log('🎉 CADASTRE ENGINE VERIFICATION: 100% SUCCESS!');
} else {
  console.error('❌ Verification failed: counts or spatial queries did not match expectations.');
  process.exit(1);
}
