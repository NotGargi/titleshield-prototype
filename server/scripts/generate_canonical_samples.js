const fs = require('fs');
const path = require('path');

function createGridGeoJson({
  datasetName,
  centerLat,
  centerLng,
  state,
  district,
  taluka,
  village,
  rows = 5,
  cols = 5,
  latStep = 0.0016,
  lngStep = 0.0018,
  surveyList,
  ownerList,
  extentList,
  landTypeList,
  guidanceBase = 60,
  marketMultiplier = 1.45,
  idPrefix
}) {
  const features = [];
  const startLat = centerLat + ((rows - 1) / 2) * latStep;
  const startLng = centerLng - ((cols - 1) / 2) * lngStep;

  let idx = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const minLat = Number((startLat - (r + 1) * latStep).toFixed(6));
      const maxLat = Number((startLat - r * latStep).toFixed(6));
      const minLng = Number((startLng + c * lngStep).toFixed(6));
      const maxLng = Number((startLng + (c + 1) * lngStep).toFixed(6));

      // Small jitter inside polygon to look organic and realistic while remaining rectangular/polygonal
      const ring = [
        [minLng, minLat],
        [minLng, maxLat],
        [maxLng, maxLat],
        [maxLng, minLat],
        [minLng, minLat]
      ];

      const survey = surveyList[idx % surveyList.length];
      const owner = ownerList[idx % ownerList.length];
      const extent = extentList[idx % extentList.length];
      const landType = landTypeList[idx % landTypeList.length];
      const subDiv = survey.includes('/') ? survey.split('/')[1] : (survey.includes('-') ? survey.split('-')[1] : '');
      const cleanScore = 88 + (idx % 11);
      const guidanceVal = Math.round(guidanceBase + (idx * 3.5));
      const marketVal = Math.round(guidanceVal * marketMultiplier);

      const cleanSurveyId = survey.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const featureId = `parcel_${idPrefix}_${cleanSurveyId}`;

      features.push({
        type: 'Feature',
        id: featureId,
        properties: {
          SURVEY_NO: survey,
          SUB_DIV: subDiv,
          GAT_NO: survey,
          KHASRA_NO: survey,
          OWNER: owner,
          OWNER_NAME: owner,
          AREA_ACRE: extent,
          EXTENT: extent,
          HOLDING_AREA: extent,
          LAND_USE: landType,
          LAND_TYPE: landType,
          VILLAGE: village,
          TALUKA: taluka,
          TEHSIL: taluka,
          DISTRICT: district,
          STATE: state,
          GUIDANCE_VAL: `₹${guidanceVal},00,000`,
          MARKET_VAL: `₹${marketVal},00,000`,
          CLEAN_TITLE_SCORE: cleanScore,
          STATUS: 'CLEAN'
        },
        geometry: {
          type: 'Polygon',
          coordinates: [ring]
        }
      });

      idx++;
    }
  }

  return {
    type: 'FeatureCollection',
    name: datasetName,
    crs: {
      type: 'name',
      properties: {
        name: 'urn:ogc:def:crs:OGC:1.3:CRS84'
      }
    },
    features
  };
}

// 1. Karnataka: Bengaluru South / Whitefield
const karnatakaData = createGridGeoJson({
  datasetName: 'bengaluru_south_cadastre',
  centerLat: 12.9698,
  centerLng: 77.7499,
  state: 'KA',
  district: 'Bengaluru Urban',
  taluka: 'Bengaluru South',
  village: 'Whitefield',
  surveyList: [
    '45/2', '45/1', '46/1', '46/2', '47',
    '48', '49/A', '49/B', '50', '51/1',
    '51/2', '52', '53', '54', '55/1',
    '55/2', '56', '57', '58', '59',
    '60', '61/1', '61/2', '62', '63'
  ],
  ownerList: [
    'Naveen Kumar & Partners',
    'K. Venkateshappa',
    'Smt. Radha Bai',
    'M. G. Manjunath',
    'Anand R. Gowda',
    'Lakshmamma & Legal Heirs',
    'B. S. Suresh',
    'H. Muniraju',
    'T. Narayanaswamy',
    'C. Vijayalakshmi'
  ],
  extentList: [
    '1 Acre 12 Gunta',
    '1 Acre 20 Guntas',
    '2 Acres 05 Guntas',
    '0 Acre 32 Gunta',
    '1 Acre 00 Gunta',
    '2,400 sq.ft'
  ],
  landTypeList: [
    'Converted Commercial / IT Corridor',
    'Agricultural (Kushka / Dry Crop)',
    'Converted Freehold (A-Khata)',
    'Residential Freehold'
  ],
  guidanceBase: 85,
  marketMultiplier: 1.45,
  idPrefix: 'ka_bengaluru_whitefield'
});

// 2. Telangana: Hyderabad / Serilingampally
const telanganaData = createGridGeoJson({
  datasetName: 'serilingampally_hyderabad_cadastre',
  centerLat: 17.4820,
  centerLng: 78.3315,
  state: 'TG',
  district: 'Hyderabad',
  taluka: 'Serilingampally',
  village: 'Serilingampally',
  surveyList: [
    '101', '102/1', '102/2', '103', '104',
    '105', '106/A', '106/B', '107', '108',
    '109', '110', '111/1', '111/2', '112',
    '113', '114', '115', '116', '117',
    '118', '119', '120', '121', '122'
  ],
  ownerList: [
    'Ch. Malleshwara Rao',
    'Venkateshwarlu',
    'K. Srinivas Reddy',
    'P. Anitha',
    'G. Ramakrishna',
    'V. Sudhakar Rao',
    'T. Madhavi Latha',
    'B. Narsimha Murthy',
    'M. Chandraiah',
    'K. Sujatha'
  ],
  extentList: [
    'Ac. 2.15 Gts',
    'Ac. 1.20 Gts',
    'Ac. 3.05 Gts',
    'Ac. 0.38 Gts',
    'Ac. 1.00 Gts',
    'Ac. 4.10 Gts'
  ],
  landTypeList: [
    'Patta (Private Freehold)',
    'Non-Agricultural Commercial (DTCP)',
    'Patta (Dry Crop)',
    'Urban Residential Freehold'
  ],
  guidanceBase: 120,
  marketMultiplier: 1.50,
  idPrefix: 'tg_serilingampally'
});

// 3. Uttar Pradesh: Gautam Buddha Nagar / Noida Sector 62
const noidaData = createGridGeoJson({
  datasetName: 'noida_gautambuddhanagar_cadastre',
  centerLat: 28.6280,
  centerLng: 77.3649,
  state: 'UP',
  district: 'Gautam Buddha Nagar',
  taluka: 'Noida',
  village: 'Sector 62',
  surveyList: [
    'Plot B-44', 'Plot B-45', 'Plot B-41', 'Plot B-42', 'Plot B-43',
    'Plot B-46', 'Plot B-47', '112', '114/1', '114/2',
    '115', '120', '121', '122', 'Plot C-12',
    'Plot C-14', 'Plot C-15', 'Plot C-16', '125', '126',
    'Plot D-01', 'Plot D-02', '130/1', '130/2', '131'
  ],
  ownerList: [
    'Surendra Pal Singh',
    'Ram Kumar Yadav',
    'Amit Saxena',
    'Virender Kumar Sharma',
    'Sunita Rani',
    'Mahesh Chand Gupta',
    'Satish Chandra Verma',
    'Pooja Aggarwal',
    'Rajesh Kumar Singh',
    'Deepak Chaudhary'
  ],
  extentList: [
    '250 sq. meters',
    '350 sq. meters',
    '0.4050 Hectare',
    '1,800 sq.ft',
    '500 sq. meters',
    '2,400 sq.ft'
  ],
  landTypeList: [
    'Urban Residential Freehold',
    'NOIDA Allotted Freehold / Registered Conveyance',
    'Commercial Institutional',
    'Bhumidhari with Transferable Rights'
  ],
  guidanceBase: 95,
  marketMultiplier: 1.45,
  idPrefix: 'up_noida_sec62'
});

// 4. Tamil Nadu: Chennai / Kanchipuram / Sriperumbudur
const tamilNaduData = createGridGeoJson({
  datasetName: 'kanchipuram_sriperumbudur_cadastre',
  centerLat: 12.9675,
  centerLng: 79.9430,
  state: 'TN',
  district: 'Kanchipuram',
  taluka: 'Sriperumbudur',
  village: 'Sriperumbudur',
  surveyList: [
    '52/1', '52/2', '53', '54', '55/1',
    '55/2', '56', '57/1', '57/2', '58',
    '59', '60', '61/1', '61/2', '62',
    '63', '64', '65', '66', '67',
    '68', '69', '70', '71', '72'
  ],
  ownerList: [
    'M. Selvakumar',
    'S. Subramanian',
    'K. Ramanathan',
    'R. Lakshmi',
    'T. Soundararajan',
    'K. Vijayalakshmi',
    'P. Balasubramaniam',
    'S. Murugan',
    'V. Dhanalakshmi',
    'N. Krishnamurthy'
  ],
  extentList: [
    '0 Hectare 40.50 Are (1.00 Acre)',
    '0 Hectare 20.25 Are (50 Cents)',
    '0 Hectare 60.75 Are (1.50 Acres)',
    '2,400 sq.ft',
    '1 Hectare 00 Are (2.47 Acres)'
  ],
  landTypeList: [
    'Ryotwari Punjai (Dry Freehold)',
    'Ryotwari Nanjai (Wet Freehold)',
    'DTCP Approved Residential Layout',
    'Industrial Freehold (SIPCOT Zone)'
  ],
  guidanceBase: 52,
  marketMultiplier: 1.50,
  idPrefix: 'tn_sriperumbudur'
});

// Target directories
const targetDirs = [
  path.resolve(__dirname, '../data/samples/cadastre'),
  path.resolve(__dirname, '../../data/samples/cadastre')
];

for (const dir of targetDirs) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(path.join(dir, 'bengaluru_south_cadastre.geojson'), JSON.stringify(karnatakaData, null, 2), 'utf8');
  fs.writeFileSync(path.join(dir, 'serilingampally_hyderabad_cadastre.geojson'), JSON.stringify(telanganaData, null, 2), 'utf8');
  fs.writeFileSync(path.join(dir, 'noida_gautambuddhanagar_cadastre.geojson'), JSON.stringify(noidaData, null, 2), 'utf8');
  fs.writeFileSync(path.join(dir, 'kanchipuram_sriperumbudur_cadastre.geojson'), JSON.stringify(tamilNaduData, null, 2), 'utf8');
}

console.log('Successfully generated canonical GeoJSON datasets for KA, TG, UP (Noida), and TN in both server and root directories!');
