/**
 * Landeed 2.0 Sovereign Land Records Architecture
 * Comprehensive Revenue Jurisdiction Hierarchy & Location Service
 * 
 * Provides canonical, case-insensitive revenue jurisdiction resolvers across
 * all 7 core supported Indian states (MH, KA, TG, UP, TN, GJ, AP) plus legacy states.
 * 
 * Hierarchy: State -> District -> Taluka / Mandal / Tehsil -> Village / Mauje
 */

export interface TalukaHierarchy {
  [talukaName: string]: string[]; // Array of village / mauje names
}

export interface DistrictHierarchy {
  [districtName: string]: {
    talukas: TalukaHierarchy;
  };
}

export interface StateHierarchyItem {
  name: string;
  districts: DistrictHierarchy;
}

export interface RevenueHierarchy {
  [stateCode: string]: StateHierarchyItem;
}

// Comprehensive case-insensitive state mapping dictionary
export const STATE_NAME_TO_CODE: Record<string, string> = {
  maharashtra: 'MH',
  mh: 'MH',
  karnataka: 'KA',
  ka: 'KA',
  telangana: 'TG',
  telengana: 'TG',
  tg: 'TG',
  ts: 'TG',
  'uttar pradesh': 'UP',
  uttarpradesh: 'UP',
  up: 'UP',
  'tamil nadu': 'TN',
  tamilnadu: 'TN',
  tn: 'TN',
  gujarat: 'GJ',
  gj: 'GJ',
  'andhra pradesh': 'AP',
  andhrapradesh: 'AP',
  ap: 'AP',
  delhi: 'DL',
  'delhi (nct)': 'DL',
  dl: 'DL',
  haryana: 'HR',
  hr: 'HR',
  rajasthan: 'RJ',
  rj: 'RJ',
  'west bengal': 'WB',
  westbengal: 'WB',
  wb: 'WB',
  'madhya pradesh': 'MP',
  madhyapradesh: 'MP',
  mp: 'MP',
  punjab: 'PB',
  pb: 'PB',
  bihar: 'BR',
  br: 'BR',
  kerala: 'KL',
  kl: 'KL',
  odisha: 'OD',
  orissa: 'OD',
  od: 'OD',
  or: 'OD',
  jharkhand: 'JH',
  jh: 'JH',
  chhattisgarh: 'CG',
  chhatisgarh: 'CG',
  cg: 'CG',
  goa: 'GA',
  ga: 'GA',
  uttarakhand: 'UK',
  uttaranchal: 'UK',
  uk: 'UK',
  'himachal pradesh': 'HP',
  himachalpradesh: 'HP',
  hp: 'HP',
  'jammu and kashmir': 'JK',
  'jammu & kashmir': 'JK',
  jk: 'JK',
  assam: 'AS',
  as: 'AS'
};

/**
 * Normalizes any raw state string (2-letter code or full name) case-insensitively
 * to the canonical 2-letter Indian state code.
 */
export function normalizeStateCode(raw?: string): string {
  if (!raw) return '';
  const trimmed = raw.trim().toLowerCase();
  if (STATE_NAME_TO_CODE[trimmed]) {
    return STATE_NAME_TO_CODE[trimmed];
  }
  const stripped = trimmed.replace(/[\s\-_]/g, '');
  if (STATE_NAME_TO_CODE[stripped]) {
    return STATE_NAME_TO_CODE[stripped];
  }
  if (trimmed.length === 2) {
    return trimmed.toUpperCase();
  }
  return raw.trim().toUpperCase();
}

/**
 * Common district aliases mapping for user-friendly searches
 */
const DISTRICT_ALIASES: Record<string, Record<string, string>> = {
  UP: {
    'gautam buddha nagar': 'Gautam Buddha Nagar (Noida)',
    'gautambuddhanagar': 'Gautam Buddha Nagar (Noida)',
    'noida': 'Gautam Buddha Nagar (Noida)',
    'greater noida': 'Gautam Buddha Nagar (Noida)',
    'gb nagar': 'Gautam Buddha Nagar (Noida)',
    'allahabad': 'Prayagraj',
    'faizabad': 'Ayodhya'
  },
  MH: {
    'aurangabad': 'Chhatrapati Sambhajinagar',
    'chhatrapati sambhaji nagar': 'Chhatrapati Sambhajinagar',
    'bombay suburban': 'Mumbai Suburban'
  },
  KA: {
    'bangalore urban': 'Bengaluru Urban',
    'bangalore': 'Bengaluru Urban',
    'bengaluru': 'Bengaluru Urban',
    'bangalore rural': 'Bengaluru Rural',
    'bengaluru rural': 'Bengaluru Rural',
    'mysore': 'Mysuru',
    'mangalore': 'Dakshina Kannada',
    'mangaluru': 'Dakshina Kannada',
    'tumkur': 'Tumakuru',
    'belgaum': 'Belagavi'
  },
  TG: {
    'hyderabad city': 'Hyderabad',
    'ranga reddy': 'Rangareddy',
    'rr district': 'Rangareddy',
    'medchal': 'Medchal-Malkajgiri',
    'malkajgiri': 'Medchal-Malkajgiri'
  },
  AP: {
    'vizag': 'Visakhapatnam',
    'waltair': 'Visakhapatnam',
    'vijayawada': 'Krishna',
    'ntr': 'Krishna',
    'ntr vijayawada': 'Krishna',
    'rajahmundry': 'East Godavari',
    'kakinada': 'East Godavari'
  },
  TN: {
    'madras': 'Chennai',
    'kanchi': 'Kanchipuram',
    'coimbatore north': 'Coimbatore',
    'coimbatore south': 'Coimbatore',
    'trichy': 'Tiruchirappalli'
  },
  HR: {
    'gurgaon': 'Gurugram'
  }
};

/**
 * Comprehensive Revenue Hierarchy across all 7 primary supported Indian states
 * plus legacy states.
 */
export const STATE_REVENUE_HIERARCHY: RevenueHierarchy = {
  // =========================================================================
  // 1. MAHARASHTRA (MH)
  // =========================================================================
  MH: {
    name: 'Maharashtra',
    districts: {
      Pune: {
        talukas: {
          Haveli: ['Wagholi', 'Hadapsar', 'Kharadi', 'Shivane', 'Dhayari', 'Uruli Kanchan', 'Kondhwa', 'Manjri', 'Keshavnagar', 'Nanded', 'Fursungi'],
          Mulshi: ['Hinjawadi', 'Maan', 'Marunji', 'Pirangut', 'Paud', 'Kasaramboli', 'Lavale', 'Sus', 'Bavdhan'],
          Baramati: ['Baramati Rural', 'Malegaon', 'Someshwar', 'Rui', 'Jalochi', 'Pandare'],
          Shirur: ['Shikrapur', 'Sanaswadi', 'Ranjangaon', 'Shirur Rural', 'Koregaon Bhima', 'Karegaon'],
          Maval: ['Talegaon Dabhade', 'Lonavala', 'Kamshet', 'Wadgaon', 'Somatane', 'Dehu Road', 'Varale'],
          Khed: ['Chakan', 'Alandi', 'Rajgurunagar', 'Mahalunge', 'Kuruli', 'Medankarwadi'],
          Daund: ['Daund Town', 'Patas', 'Kurkumbh', 'Kedgaon'],
          Purandar: ['Saswad', 'Jejuri', 'Belsar', 'Dive']
        }
      },
      'Mumbai Suburban': {
        talukas: {
          Bandra: ['Bandra West', 'Bandra East', 'Khar', 'Santacruz East', 'Santacruz West'],
          Andheri: ['Andheri East', 'Andheri West', 'Versova', 'Vile Parle East', 'Vile Parle West', 'Juhu', 'Marol', 'Oshiwara'],
          Borivali: ['Borivali West', 'Borivali East', 'Kandivali East', 'Kandivali West', 'Dahisar East', 'Dahisar West', 'Malad'],
          Kurla: ['Kurla West', 'Kurla East', 'Chembur', 'Ghatkopar East', 'Ghatkopar West', 'Tilak Nagar', 'Vidyavihar']
        }
      },
      Thane: {
        talukas: {
          Thane: ['Thane West', 'Majiwada', 'Ghodbunder', 'Vartak Nagar', 'Naupada', 'Kopri', 'Kasarvadavali', 'Wagle Estate'],
          Kalyan: ['Kalyan West', 'Kalyan East', 'Dombivli East', 'Dombivli West', 'Titwala', 'Mohone'],
          Bhiwandi: ['Bhiwandi Rural', 'Anjur', 'Narpoli', 'Padgha', 'Kasheli'],
          Ulhasnagar: ['Ulhasnagar 1', 'Ulhasnagar 2', 'Ulhasnagar 3', 'Ulhasnagar 4', 'Ulhasnagar 5', 'Vitthalwadi'],
          Ambernath: ['Ambernath East', 'Ambernath West', 'Badlapur East', 'Badlapur West']
        }
      },
      Nashik: {
        talukas: {
          Nashik: ['Panchavati', 'CIDCO', 'Satpur', 'Nashik Road', 'Deolali', 'Gangapur Road', 'Indira Nagar'],
          Sinnar: ['Sinnar Rural', 'Musalgaon', 'Gonde', 'Malegaon MIDC'],
          Niphad: ['Niphad Rural', 'Pimpalgaon Baswant', 'Lasalgaon', 'Ozar'],
          Igatpuri: ['Igatpuri Town', 'Ghoti', 'Kasara Ghat Area']
        }
      },
      Nagpur: {
        talukas: {
          'Nagpur Urban': ['Sitabuldi', 'Dharampeth', 'Ramdaspeth', 'Civil Lines', 'Sadar', 'Dhantoli', 'Wardhaman Nagar'],
          'Nagpur Rural': ['Besa', 'Pipla', 'Wadi', 'Hingna Road', 'Kamptee', 'Butibori'],
          Hingna: ['Hingna MIDC', 'Wanadongri', 'Nildoh', 'Mondha'],
          Kamptee: ['Kamptee Cantt', 'Kanhan', 'Dragon Palace Area']
        }
      },
      'Chhatrapati Sambhajinagar': {
        talukas: {
          Aurangabad: ['Cidco', 'Waluj', 'Chikalthana', 'Shahganj', 'Garkheda', 'Beed Bypass', 'Railway Station Area'],
          Paithan: ['Paithan Rural', 'Bidkin', 'Balanagar'],
          Gangapur: ['Gangapur Town', 'Lasur', 'Waluj MIDC']
        }
      },
      Satara: {
        talukas: {
          Satara: ['Satara City', 'Kodoli', 'Shendre', 'Karanje'],
          Karad: ['Karad Rural', 'Malkapur', 'Ogalewadi']
        }
      },
      Kolhapur: {
        talukas: {
          Karvir: ['Kolhapur City', 'Gandhinagar', 'Uchgaon', 'Shiroli'],
          Hatkanangale: ['Ichalkaranji', 'Hatkanangale Rural', 'Hupari']
        }
      }
    }
  },

  // =========================================================================
  // 2. KARNATAKA (KA)
  // =========================================================================
  KA: {
    name: 'Karnataka',
    districts: {
      'Bengaluru Urban': {
        talukas: {
          'Bengaluru South': ['Electronic City', 'Koramangala', 'HSR Layout', 'BTM Layout', 'Jayanagar', 'Hulimavu', 'Begur', 'Bommanahalli', 'Basavanagudi'],
          'Bengaluru East': ['Whitefield', 'Bellandur', 'Marathahalli', 'Varthur', 'Indiranagar', 'Mahadevapura', 'Kadugodi', 'Hoodi', 'KR Puram'],
          'Bengaluru North': ['Hebbal', 'Peenya', 'Jalahalli', 'RT Nagar', 'Yeshwanthpur', 'Malleshwaram', 'Mathikere'],
          Anekal: ['Attibele', 'Chandapura', 'Jigani', 'Sarjapur', 'Bannerghatta', 'Anekal Town', 'Marsur'],
          Yelahanka: ['Yelahanka New Town', 'Vidyaranyapura', 'Sahakarnagar', 'Kogilu', 'Thanisandra', 'Jakkur']
        }
      },
      Mysuru: {
        talukas: {
          'Mysuru Sadar': ['Vijayanagar', 'Gokulam', 'Kuvempunagar', 'Saraswathipuram', 'Jayalakshmipuram', 'Hebbal'],
          Nanjangud: ['Nanjangud Town', 'Biligere', 'Hullahalli', 'Kasaba', 'Chinnamballi'],
          Hunsur: ['Hunsur Town', 'Bilikere', 'Kasaba', 'Gavadagere']
        }
      },
      Tumakuru: {
        talukas: {
          Tumakuru: ['Tumakuru City', 'Kyatsandra', 'Hirehalli', 'Kasaba', 'Belagumba'],
          Tiptur: ['Tiptur Town', 'Honnavalli', 'Kibbanahalli', 'Nonavinakere'],
          Kunigal: ['Kunigal Town', 'Huliyurdurga', 'Amruthur', 'Kasaba'],
          Sira: ['Sira Town', 'Kallambella', 'Bukkapatna']
        }
      },
      'Dakshina Kannada': {
        talukas: {
          Mangaluru: ['Hampankatta', 'Kadri', 'Bejai', 'Surathkal', 'Panambur', 'Ullal', 'Derebail', 'Kankanady'],
          Bantwal: ['BC Road', 'Bantwal Town', 'Panemangalore', 'Vittal', 'Mani'],
          Puttur: ['Puttur Town', 'Uppinangady', 'Kabaka', 'Bettampady']
        }
      },
      'Bengaluru Rural': {
        talukas: {
          Devanahalli: ['Devanahalli Town', 'Kempegowda Airport Area', 'Vijayapura', 'Channarayapatna'],
          Nelamangala: ['Nelamangala Town', 'Sompura', 'T. Begur', 'Kasaba'],
          Doddaballapura: ['Doddaballapura Town', 'Tubagere', 'Kasaba', 'Sasalu'],
          Hosakote: ['Hosakote Town', 'Jadigenahalli', 'Nandagudi', 'Anugondanahalli']
        }
      },
      Belagavi: {
        talukas: {
          Belagavi: ['Belagavi City', 'Tilakwadi', 'Shahapur', 'Vadgaon', 'Udyambag'],
          Gokak: ['Gokak Town', 'Konnur', 'Ghataprabha']
        }
      },
      Udupi: {
        talukas: {
          Udupi: ['Udupi Town', 'Manipal', 'Malpe', 'Santhekatte'],
          Kundapura: ['Kundapura Town', 'Koteshwara', 'Saligrama', 'Byndoor']
        }
      }
    }
  },

  // =========================================================================
  // 3. TELANGANA (TG)
  // =========================================================================
  TG: {
    name: 'Telangana',
    districts: {
      Hyderabad: {
        talukas: {
          Serilingampally: ['Gachibowli', 'Madhapur', 'Kondapur', 'Nanakramguda', 'Hafeezpet', 'Miyapur', 'Hitec City', 'Financial District'],
          Khairatabad: ['Somajiguda', 'Punjagutta', 'Ameerpet', 'Sanathnagar', 'Jubilee Hills', 'Banjara Hills'],
          Secunderabad: ['Marredpally', 'Begumpet', 'Paradise', 'Trimulgherry', 'Bowenpally', 'Malkajgiri Road'],
          Charminar: ['Old City', 'Moghalpura', 'Falaknuma', 'Chandrayangutta', 'Bahadurpura', 'Santosh Nagar'],
          Golconda: ['Langar Houz', 'Mehdipatnam', 'Karwan', 'Toli Chowki', 'Asif Nagar'],
          Shaikpet: ['Shaikpet Village', 'Film Nagar', 'Jubilee Hills Road 36', 'Dargah']
        }
      },
      Rangareddy: {
        talukas: {
          Gandipet: ['Kokapet', 'Gandipet', 'Manikonda', 'Puppalguda', 'Narsingi', 'Bandlaguda Jagir', 'Khanapur'],
          Rajendranagar: ['Attapur', 'Budvel', 'Rajendranagar', 'Hyderguda', 'Upperpally', 'Shamshabad Rural'],
          Ibrahimpatnam: ['Ibrahimpatnam Rural', 'Bongloor', 'Mangalpally', 'Adibatla', 'Pocharam'],
          Shamshabad: ['Shamshabad Airport Area', 'Ootapally', 'Kotwalguda', 'Mamidipally', 'Ghansimiaguda'],
          Saroornagar: ['Saroornagar', 'Karmanghat', 'Champapet', 'Kothapet', 'Dilsukhnagar', 'LB Nagar'],
          Maheshwaram: ['Maheshwaram Town', 'Fab City', 'Kandukur', 'Mankhal']
        }
      },
      'Medchal-Malkajgiri': {
        talukas: {
          Malkajgiri: ['Malkajgiri', 'Safilguda', 'Anandbagh', 'Moula Ali', 'Neredmet'],
          Uppal: ['Uppal', 'Habsiguda', 'Ramanthapur', 'Nacharam', 'Mallapur', 'Boduppal'],
          Kukatpally: ['Kukatpally', 'KPHB Colony', 'Nizampet', 'Bachupally', 'Pragathi Nagar', 'Bowrampet'],
          Medchal: ['Medchal Town', 'Kandlakoya', 'Gundlapochampally', 'Kompally', 'Dabilpur'],
          Alwal: ['Alwal', 'Lothkunta', 'Old Alwal', 'Macha Bolarum']
        }
      },
      Sangareddy: {
        talukas: {
          Patancheru: ['Patancheru MIDC', 'Ameenpur', 'Beeramguda', 'Isnapur'],
          Sangareddy: ['Sangareddy Town', 'Pothireddypally', 'Kandi'],
          Ramachandrapuram: ['BHEL', 'Tellapur', 'RC Puram']
        }
      },
      Warangal: {
        talukas: {
          Warangal: ['Warangal City', 'Fort Warangal', 'Kashibugga'],
          Hanamkonda: ['Hanamkonda', 'Kazipet', 'Subedari', 'Waddepally']
        }
      },
      Nalgonda: {
        talukas: {
          Nalgonda: ['Nalgonda Town', 'Clock Tower', 'Manyamchelka'],
          Miryalaguda: ['Miryalaguda Town', 'Sagar Road']
        }
      },
      Khammam: {
        talukas: {
          'Khammam Urban': ['Khammam City', 'Wyra Road', 'Mamillagudem'],
          'Khammam Rural': ['Edulapuram', 'Theldarupally']
        }
      }
    }
  },

  // =========================================================================
  // 4. UTTAR PRADESH (UP)
  // =========================================================================
  UP: {
    name: 'Uttar Pradesh',
    districts: {
      'Gautam Buddha Nagar (Noida)': {
        talukas: {
          Noida: ['Sector 62', 'Sector 128', 'Sector 150', 'Sector 18', 'Chhajarsi', 'Sector 137', 'Sector 76', 'Sector 44', 'Sector 15', 'Sector 50'],
          Dadri: ['Greater Noida Pari Chowk', 'Tech Zone 4', 'Surajpur', 'Knowledge Park', 'Alpha 1', 'Beta 1', 'Chi-Phi', 'Ecotech'],
          Jewar: ['Jewar International Airport Zone', 'Dayanatpur', 'Ranhera', 'Kishorpur', 'Rohi', 'Sabota Mustafabad']
        }
      },
      Lucknow: {
        talukas: {
          'Lucknow Sadar': ['Gomti Nagar', 'Vibhuti Khand', 'Hazratganj', 'Mahanagar', 'Aliganj', 'Indira Nagar', 'Chowk', 'Aminabad'],
          'Sarojini Nagar': ['Amausi', 'Transport Nagar', 'Ashiyana', 'Omaxe City', 'Krishna Nagar'],
          'Bakshi Ka Talab': ['BKT Rural', 'Itaunja', 'Bargadi', 'Kathwara'],
          Mohanlalganj: ['Mohanlalganj Town', 'Gosainganj', 'Kalli Pashchim', 'Nagram']
        }
      },
      Ghaziabad: {
        talukas: {
          Sahibabad: ['Panchsheel Park', 'Mohan Nagar', 'Rajendra Nagar', 'Shyam Park', 'Shalimar Garden', 'Brij Vihar', 'Pasonda', 'Kaushambi'],
          Ghaziabad: ['Indirapuram', 'Vaishali', 'Vasundhara', 'Raj Nagar Extension', 'Crossings Republik', 'Kavi Nagar', 'Govindpuram'],
          Modinagar: ['Modinagar Town', 'Muradnagar', 'Niwari', 'Bhojpur'],
          Loni: ['Loni Border', 'Tronica City', 'DLF Ankur Vihar', 'Behta Hajipur']
        }
      },
      'Kanpur Nagar': {
        talukas: {
          'Kanpur Sadar': ['Civil Lines', 'Swaroop Nagar', 'Kakadeo', 'Kidwai Nagar', 'Govind Nagar', 'Cantt'],
          Kalyanpur: ['Kalyanpur', 'IIT Kanpur Campus', 'Bithoor', 'Panki', 'Rawatpur'],
          Ghatampur: ['Ghatampur Town', 'Patara', 'Bhitargaon']
        }
      },
      Varanasi: {
        talukas: {
          'Varanasi Sadar': ['Godowlia', 'Sigra', 'Bhelupur', 'Lanka (BHU)', 'Cantt', 'Shivpur', 'Sarnath', 'Pandeypur'],
          Pindra: ['Babatpur (Airport Area)', 'Pindra Rural', 'Phulpur', 'Mangari'],
          'Raja Talab': ['Raja Talab Town', 'Rohania', 'Mirzamurad']
        }
      },
      Agra: {
        talukas: {
          'Agra Sadar': ['Tajganj', 'Sanjay Place', 'Civil Lines', 'Dayalbagh', 'Kamla Nagar'],
          Fatehabad: ['Fatehabad Rural', 'Shamshabad']
        }
      },
      Prayagraj: {
        talukas: {
          'Prayagraj Sadar': ['Civil Lines', 'Katra', 'Georgetown', 'Ashok Nagar', 'Naini'],
          Phulpur: ['Phulpur Town', 'Jhunsi', 'Andawa']
        }
      },
      Meerut: {
        talukas: {
          'Meerut Sadar': ['Meerut Cantt', 'Shastri Nagar', 'Modipuram', 'Ganga Nagar']
        }
      },
      Ayodhya: {
        talukas: {
          'Ayodhya Sadar': ['Ayodhya Dham', 'Ram Janmabhoomi Area', 'Civil Lines', 'Faizabad Cantt', 'Naka']
        }
      }
    }
  },

  // =========================================================================
  // 5. TAMIL NADU (TN)
  // =========================================================================
  TN: {
    name: 'Tamil Nadu',
    districts: {
      Kanchipuram: {
        talukas: {
          Sriperumbudur: ['Sriperumbudur Town', 'Irungattukottai', 'Oragadam', 'Mambakkam', 'Sunguvarchatram', 'Pondur', 'Nemili', 'Vallam'],
          Kanchipuram: ['Kanchipuram Town', 'Chinna Kanchipuram', 'Periya Kanchipuram', 'Orikkai', 'Sevilimedu', 'Thenambakkam'],
          Kundrathur: ['Kundrathur', 'Mangadu', 'Kovur', 'Somangalam', 'Thandalam', 'Gerugambakkam', 'Paraniputhur'],
          Walajabad: ['Walajabad Town', 'Nathanallur', 'Ayyampettai', 'Uthukadu', 'Thenneri'],
          Uthiramerur: ['Uthiramerur Town', 'Kaliyampoondi', 'Salavakkam', 'Manampathy', 'Kavanur']
        }
      },
      Chennai: {
        talukas: {
          Guindy: ['Guindy', 'Alandur', 'Ekkattuthangal', 'Saidapet', 'Nandanam', 'St. Thomas Mount'],
          Mylapore: ['Mylapore', 'Mandaveli', 'Santhome', 'RA Puram', 'Alwarpet', 'Royapettah'],
          Tondiarpet: ['Tondiarpet', 'Royapuram', 'Washermanpet', 'George Town', 'Sowcarpet'],
          Egmore: ['Egmore', 'Kilpauk', 'Nungambakkam', 'Chetpet', 'Purasawalkam'],
          Velachery: ['Velachery', 'Madipakkam', 'Adambakkam', 'Keelkattalai', 'Taramani'],
          Sholinganallur: ['Sholinganallur', 'Perungudi', 'Thoraipakkam', 'Semmancheri', 'Karapakkam', 'Injambakkam', 'Akkarai']
        }
      },
      Tiruvallur: {
        talukas: {
          Tiruvallur: ['Tiruvallur Town', 'Manavalanagar', 'Sevvapet', 'Putlur', 'Ikkadu'],
          Poonamallee: ['Poonamallee Town', 'Senneerkuppam', 'Kattupakkam', 'Iyyappanthangal', 'Porur'],
          Avadi: ['Avadi Town', 'Pattabiram', 'Thirumullaivoyal', 'Mittanamalli', 'HVF Estate'],
          Ambattur: ['Ambattur OT', 'Ambattur Industrial Estate', 'Mogappair East', 'Mogappair West', 'Padi'],
          Gummidipoondi: ['Gummidipoondi Town', 'SIPCOT Complex', 'Arambakkam', 'Kavarapettai']
        }
      },
      Coimbatore: {
        talukas: {
          'Coimbatore North': ['RS Puram', 'Saibaba Colony', 'Gandhipuram', 'Ganapathy', 'Saravanampatti', 'Peelamedu', 'Thudiyalur'],
          'Coimbatore South': ['Town Hall', 'Ukkadam', 'Singanallur', 'Ramanathapuram', 'Podanur', 'Sundarapuram'],
          Pollachi: ['Pollachi Town', 'Anaimalai', 'Kinathukadavu', 'Negamam', 'Kottur']
        }
      },
      Madurai: {
        talukas: {
          'Madurai North': ['Tallakulam', 'KK Nagar', 'Anna Nagar', 'Iyer Bungalow', 'Othakadai', 'Alagar Kovil Road'],
          'Madurai South': ['Madurai Town', 'Meenakshi Amman Temple Area', 'Thiruparankundram', 'Pasumalai', 'Villapuram'],
          Melur: ['Melur Town', 'Kottampatti', 'Uranganpatti', 'Karungalakudi']
        }
      },
      Chengalpattu: {
        talukas: {
          Chengalpattu: ['Chengalpattu Town', 'Maraimalai Nagar', 'Mahindra World City', 'Singaperumal Koil'],
          Tambaram: ['Tambaram East', 'Tambaram West', 'Chromepet', 'Pallavaram', 'Selaiyur'],
          Vandalur: ['Vandalur', 'Urapakkam', 'Guduvanchery', 'Perungalathur']
        }
      },
      Tiruchirappalli: {
        talukas: {
          'Tiruchirappalli Urban': ['Cantonment', 'Thillai Nagar', 'Srirangam', 'K.K. Nagar']
        }
      },
      Salem: {
        talukas: {
          'Salem Urban': ['Fairlands', 'Alagapuram', 'Hasthampatti', 'Shevapet', 'Suramangalam']
        }
      }
    }
  },

  // =========================================================================
  // 6. GUJARAT (GJ)
  // =========================================================================
  GJ: {
    name: 'Gujarat',
    districts: {
      Ahmedabad: {
        talukas: {
          Daskroi: ['Bopal', 'Prahlad Nagar', 'Bodakdev', 'Thaltej', 'Vastrapur', 'Satellite', 'South Bopal', 'Shela', 'Ambli'],
          'Ahmedabad City': ['Navrangpura', 'Ellisbridge', 'Paldi', 'Ambawadi', 'Ashram Road', 'Maninagar', 'Sabarmati'],
          Sanand: ['Sanand Town', 'GIDC Sanand', 'Changodar', 'Moraiya', 'Nidhrad'],
          Dholka: ['Dholka Town', 'Koth', 'Dholera SIR Hub', 'Rampur'],
          Bavla: ['Bavla Town', 'Bagodara', 'Dholera Road'],
          Viramgam: ['Viramgam Town', 'Hansalpur', 'Mandal GIDC']
        }
      },
      Surat: {
        talukas: {
          'Surat City (Choryasi)': ['Athwa Lines', 'Vesu', 'Adajan', 'Piplod', 'Pal', 'City Light', 'Althan', 'Dumas'],
          Olpad: ['Olpad Town', 'Sayan', 'Masma', 'Kim'],
          Kamrej: ['Kamrej Town', 'Kholwad', 'Laskana', 'Pasodara'],
          Majura: ['Majura Gate', 'Khatodara', 'Udhna', 'Pandesara'],
          Bardoli: ['Bardoli Town', 'Baben', 'Ten']
        }
      },
      Vadodara: {
        talukas: {
          'Vadodara Urban': ['Alkapuri', 'Akota', 'Fatehgunj', 'Gotri', 'Vasna', 'Manjalpur', 'Karelibaug', 'Sayajigunj'],
          Waghodia: ['Waghodia Town', 'Nimeta', 'Jarod', 'Limda'],
          Padra: ['Padra Town', 'Mobha', 'Vadu'],
          Savli: ['Savli Town', 'Manjusar GIDC']
        }
      },
      Rajkot: {
        talukas: {
          'Rajkot Urban': ['Yagnik Road', 'Kalawad Road', 'University Road', '150 Feet Ring Road', 'Mavdi', 'Nana Mava', 'Kothariya'],
          Lodhika: ['Metoda GIDC', 'Lodhika Town'],
          Gondal: ['Gondal Town', 'Shapar Veraval', 'Bileshwar']
        }
      },
      Gandhinagar: {
        talukas: {
          Gandhinagar: ['Sector 1 to 30', 'Infocity', 'GIFT City', 'Kudasan', 'Raysan', 'Randesan', 'Sargasan', 'Koba'],
          Kalol: ['Kalol Town', 'Saij', 'Vadavswami', 'Chhatral GIDC', 'Borisana'],
          Dehgam: ['Dehgam Town', 'Bahiyal', 'Rakhial'],
          Mansa: ['Mansa Town', 'Itadara', 'Lodra']
        }
      },
      Bhavnagar: {
        talukas: {
          'Bhavnagar Urban': ['Waghawadi Road', 'Kaliyabid', 'Ghogha Circle', 'Chitra']
        }
      }
    }
  },

  // =========================================================================
  // 7. ANDHRA PRADESH (AP)
  // =========================================================================
  AP: {
    name: 'Andhra Pradesh',
    districts: {
      Visakhapatnam: {
        talukas: {
          'Visakhapatnam Urban': ['MVP Colony', 'Madhurawada', 'Rushikonda', 'Siripuram', 'Maharani Peta', 'Dwaraka Nagar', 'Seethammadhara', 'Jagadamba Junction'],
          Gajuwaka: ['Gajuwaka', 'Kurmannapalem', 'Steel Plant Township', 'Autonagar', 'Vadlapudi', 'Pedagantyada'],
          'Bheemunipatnam (Bheemili)': ['Bheemili Town', 'Tagarapuvalasa', 'INS Kalinga Area', 'Kapuluppada', 'Anandapuram'],
          Anakapalle: ['Anakapalle Town', 'Kasimkota', 'Sankaram', 'Munagapaka']
        }
      },
      Krishna: {
        talukas: {
          Machilipatnam: ['Machilipatnam Town', 'Chilakalapudi', 'Rustumbada', 'Campbellpet', 'Kona'],
          Gudivada: ['Gudivada Town', 'Rajendra Nagar', 'Betavolu', 'Billapadu'],
          'Vijayawada Urban': ['Benz Circle', 'MG Road', 'Suryaraopet', 'Governorpet', 'Moghalrajpuram', 'Gunadala'],
          'Vijayawada Rural': ['Enikepadu', 'Prasadampadu', 'Nunna', 'Gollapudi', 'Ramavarappadu'],
          Ibrahimpatnam: ['Ibrahimpatnam', 'Kondapalli', 'Ferry', 'Kotikalapudi']
        }
      },
      Guntur: {
        talukas: {
          'Guntur Urban': ['Brodipet', 'Arundelpet', 'Lakshmipuram', 'Gujjanagundla', 'Pattabhipuram', 'Syamala Nagar'],
          Mangalagiri: ['Mangalagiri Town', 'AIIMS Mangalagiri', 'Nowlur', 'Atkur', 'Nidamarru', 'Kaza'],
          Tadepalli: ['Tadepalli', 'Undavalli', 'Kunchanapalli', 'Kolanukonda', 'Vaddeswaram', 'Penumaka'],
          Tenali: ['Tenali Town', 'Morrispet', 'Chenchupet', 'Angalakuduru', 'Nandivelugu']
        }
      },
      Chittoor: {
        talukas: {
          Chittoor: ['Chittoor Town', 'Murakambattu', 'Iruvaram', 'Kattamanchi', 'Greamspet'],
          'Tirupati Urban': ['Alipiri', 'Tiruchanur', 'Korlagunta', 'Bhavani Nagar', 'Balaji Colony', 'Renigunta', 'Karakambadi'],
          Chandragiri: ['Chandragiri Town', 'Srinivasa Mangapuram', 'A. Rangampet', 'Narasingapuram'],
          Srikalahasti: ['Srikalahasti Town', 'Thottambedu', 'Panagal', 'Subrahmanya Nagar'],
          Madanapalle: ['Madanapalle Town', 'Valasapalle', 'Ponnetipalem', 'Basinikonda']
        }
      },
      'East Godavari': {
        talukas: {
          'Rajamahendravaram Urban': ['Danavaipeta', 'Aryapuram', 'Innespeta', 'Prakash Nagar', 'Morampudi'],
          'Rajamahendravaram Rural': ['Hukumpeta', 'Bommuru', 'Dowleswaram', 'Kadiam', 'Rajanagaram'],
          'Kakinada Urban': ['Surya Rao Peta', 'Gandhi Nagar', 'Jagannaickpur', 'Bhanugudi', 'Madhavapatnam'],
          Amalapuram: ['Amalapuram Town', 'Bandarulanka', 'Peruru', 'Bhatnavilli']
        }
      },
      Tirupati: {
        talukas: {
          'Tirupati Urban': ['Alipiri', 'Tiruchanur', 'Korlagunta', 'Bhavani Nagar', 'Balaji Colony', 'Renigunta'],
          Chandragiri: ['Chandragiri Town', 'Srinivasa Mangapuram', 'A. Rangampet'],
          Srikalahasti: ['Srikalahasti Town', 'Thottambedu', 'Panagal']
        }
      },
      Kurnool: {
        talukas: {
          'Kurnool Urban': ['Kurnool Old Town', 'Nandyal Road', 'C-Camp', 'B-Camp', 'Gayatri Estate'],
          Dhone: ['Dhone Town', 'Peapully']
        }
      }
    }
  },

  // =========================================================================
  // ADDITIONAL PAN-INDIA STATES (Legacy Preservation)
  // =========================================================================
  DL: {
    name: 'Delhi',
    districts: {
      'New Delhi': {
        talukas: {
          Chanakyapuri: ['Chanakyapuri Diplomatic Enclave', 'Moti Bagh'],
          'Connaught Place': ['Barakhamba Road', 'Janpath', 'Parliament Street'],
          'Vasant Vihar': ['Vasant Vihar', 'Munirka', 'Vasant Kunj']
        }
      },
      'South Delhi': {
        talukas: {
          'Hauz Khas': ['Hauz Khas Enclave', 'Saket', 'Green Park', 'Safdarjung'],
          Saket: ['Saket District Centre', 'Pushp Vihar', 'Sainik Farm'],
          Mehrauli: ['Mehrauli Town', 'Qutab Minar Area', 'Kishangarh']
        }
      },
      'South West Delhi (Dwarka)': {
        talukas: {
          Dwarka: ['Sector 6', 'Sector 12', 'Sector 21', 'Sector 23'],
          Najafgarh: ['Najafgarh Town', 'Dichaon Kalan'],
          'Delhi Cantonment': ['Delhi Cantt', 'Dhaula Kuan']
        }
      },
      'North West Delhi (Rohini)': {
        talukas: {
          Rohini: ['Sector 3', 'Sector 8', 'Sector 13', 'Sector 24']
        }
      },
      'Central Delhi': {
        talukas: {
          KarolBagh: ['Karol Bagh', 'Pusa Road', 'Rajendra Nagar']
        }
      },
      'East Delhi': {
        talukas: {
          MayurVihar: ['Mayur Vihar Phase 1', 'Phase 2', 'Patparganj']
        }
      }
    }
  },

  HR: {
    name: 'Haryana',
    districts: {
      Gurugram: {
        talukas: {
          Wazirabad: ['Cyber City', 'DLF Phase 1-5', 'Golf Course Road', 'Sector 54'],
          Badshahpur: ['Sohna Road', 'Golf Course Ext Road', 'Sector 65', 'Sector 67'],
          'Gurugram Sadar': ['Civil Lines', 'Old Railway Road', 'Sector 14', 'Sector 15'],
          Manesar: ['IMT Manesar', 'Sector 1', 'Sector 8'],
          Pataudi: ['Pataudi Town', 'Haileymandi'],
          Sohna: ['Sohna Town', 'Damdama']
        }
      },
      Faridabad: {
        talukas: {
          Faridabad: ['Sector 15', 'Sector 16', 'NIT Faridabad'],
          Ballabgarh: ['Ballabgarh Town', 'Sector 58'],
          Badkhal: ['Badkhal Lake Area', 'Greenfield Colony']
        }
      },
      Panchkula: {
        talukas: {
          Panchkula: ['Sector 5', 'Sector 20', 'MDC Sector 4'],
          Kalka: ['Kalka Town', 'Pinjore']
        }
      },
      Sonipat: {
        talukas: {
          Sonipat: ['Kundli', 'Rai', 'Murthal']
        }
      },
      Karnal: {
        talukas: {
          Karnal: ['Model Town', 'Sector 13', 'Gharaunda']
        }
      },
      Panipat: {
        talukas: {
          Panipat: ['Model Town', 'Industrial Area', 'Samalkha']
        }
      },
      Ambala: {
        talukas: {
          Ambala: ['Ambala Cantt', 'Ambala City']
        }
      },
      Rohtak: {
        talukas: {
          Rohtak: ['Model Town', 'IMT Rohtak', 'Sampla']
        }
      }
    }
  },

  RJ: {
    name: 'Rajasthan',
    districts: {
      Jaipur: {
        talukas: {
          Sanganer: ['Malviya Nagar', 'Mansarovar', 'Jagatpura', 'Pratap Nagar'],
          'Jaipur Sadar': ['C-Scheme', 'Civil Lines', 'Bani Park', 'Vaishali Nagar'],
          Amber: ['Amber Fort Area', 'Kukas', 'Amer Town'],
          Chaksu: ['Chaksu Town', 'Kotkhawda']
        }
      },
      Jodhpur: {
        talukas: {
          Jodhpur: ['Shastri Nagar', 'Ratanada', 'Paota', 'Sardarpura']
        }
      },
      Udaipur: {
        talukas: {
          Girwa: ['Fateh Sagar Area', 'Panchwati', 'Hiran Magri']
        }
      },
      Kota: {
        talukas: {
          Ladpura: ['Vigyan Nagar', 'Talwandi', 'Mahaveer Nagar']
        }
      },
      Ajmer: {
        talukas: {
          Ajmer: ['Civil Lines', 'Vaishali Nagar', 'Pushkar Road']
        }
      },
      Bikaner: {
        talukas: {
          Bikaner: ['Kanta Khaturia Colony', 'Jai Narayan Vyas Colony']
        }
      },
      Alwar: {
        talukas: {
          Alwar: ['Neemrana GIDC', 'Bhiwadi', 'MIA Alwar']
        }
      }
    }
  },

  WB: {
    name: 'West Bengal',
    districts: {
      Kolkata: {
        talukas: {
          'Kolkata Central': ['BBD Bagh', 'Park Street', 'Esplanade', 'Bowbazar'],
          Alipore: ['Alipore', 'New Alipore', 'Bhowanipore'],
          Sealdah: ['Sealdah', 'Beliaghata', 'Entally']
        }
      },
      'North 24 Parganas': {
        talukas: {
          'Bidhan Nagar (Salt Lake)': ['Sector V', 'Sector I', 'Sector II', 'Sector III'],
          Rajarhat: ['New Town Action Area 1', 'New Town Action Area 2', 'Chinar Park'],
          Barasat: ['Barasat Town', 'Madhyamgram', 'Hridaypur']
        }
      },
      'South 24 Parganas': {
        talukas: {
          Baruipur: ['Baruipur Town', 'Sonarpur', 'Garia']
        }
      },
      Howrah: {
        talukas: {
          Howrah: ['Shibpur', 'Bally', 'Salkia']
        }
      },
      'Darjeeling (Siliguri)': {
        talukas: {
          Siliguri: ['Sevoke Road', 'Pradhan Nagar', 'Matigara']
        }
      },
      'Paschim Bardhaman': {
        talukas: {
          Asansol: ['Asansol City', 'Durgapur City Centre', 'City Centre']
        }
      }
    }
  },

  MP: {
    name: 'Madhya Pradesh',
    districts: {
      Indore: {
        talukas: {
          'Indore Sadar': ['Vijay Nagar', 'Super Corridor', 'Palasia', 'AB Road'],
          Sanwer: ['Sanwer Town', 'Dharampuri'],
          Depalpur: ['Depalpur Town', 'Betma'],
          Mhow: ['Mhow Cantt', 'Pithampur Link']
        }
      },
      Bhopal: {
        talukas: {
          Huzur: ['MP Nagar', 'Arera Colony', 'Hoshangabad Road', 'Kolar Road']
        }
      },
      Gwalior: {
        talukas: {
          Gwalior: ['City Centre', 'Lashkar', 'Morar']
        }
      },
      Jabalpur: {
        talukas: {
          Jabalpur: ['Civil Lines', 'Wright Town', 'Vijay Nagar']
        }
      },
      Ujjain: {
        talukas: {
          Ujjain: ['Freeganj', 'Mahakal Corridor Area', 'Nanakheda']
        }
      }
    }
  },

  PB: {
    name: 'Punjab',
    districts: {
      'SAS Nagar (Mohali)': {
        talukas: {
          Mohali: ['Sector 70', 'Sector 82 IT City', 'Phase 7', 'Sector 68'],
          Kharar: ['Kharar Town', 'Sunny Enclave'],
          'Dera Bassi': ['Dera Bassi Town', 'Zirakpur', 'VIP Road']
        }
      },
      Ludhiana: {
        talukas: {
          'Ludhiana East': ['Model Town', 'Sarabha Nagar', 'Ferozepur Road']
        }
      },
      Amritsar: {
        talukas: {
          'Amritsar-I': ['Ranjit Avenue', 'Mall Road', 'Lawrence Road']
        }
      },
      Jalandhar: {
        talukas: {
          'Jalandhar-I': ['Model Town', 'Civil Lines', 'Cantt Road']
        }
      },
      Patiala: {
        talukas: {
          Patiala: ['Urban Estate', 'Baradari', 'Leela Bhawan']
        }
      },
      Bathinda: {
        talukas: {
          Bathinda: ['Civil Lines', 'Model Town', 'Goniana Road']
        }
      }
    }
  },

  BR: {
    name: 'Bihar',
    districts: {
      Patna: {
        talukas: {
          'Patna Sadar': ['Bailey Road', 'Boring Road', 'Kankarbagh', 'Patliputra'],
          Danapur: ['Danapur Cantt', 'Khagaul', 'Saguna More'],
          'Phulwari Sharif': ['Phulwari Sharif Town', 'AIIMS Patna Area'],
          Barh: ['Barh Town', 'Bakhtiyarpur']
        }
      },
      Gaya: {
        talukas: {
          Gaya: ['Civil Lines', 'Bodh Gaya', 'AP Colony']
        }
      },
      Muzaffarpur: {
        talukas: {
          Muzaffarpur: ['Kalambagh Road', 'Mithanpura', 'Brahmpura']
        }
      },
      Bhagalpur: {
        talukas: {
          Bhagalpur: ['Adampur', 'Tilkamanjhi', 'Zero Mile']
        }
      },
      Darbhanga: {
        talukas: {
          Darbhanga: ['Laheriasarai', 'Tower Chowk', 'Benta']
        }
      }
    }
  },

  KL: {
    name: 'Kerala',
    districts: {
      'Ernakulam (Kochi)': {
        talukas: {
          'Kanakayannur (Kochi)': ['MG Road', 'Marine Drive', 'Panampilly Nagar', 'Kadavanthra'],
          Aluva: ['Aluva Town', 'Edappally', 'Kalamassery'],
          'Kunnathunad (Kakkanad)': ['Kakkanad', 'InfoPark', 'Edathala', 'Vazhakkala']
        }
      },
      Thiruvananthapuram: {
        talukas: {
          Thiruvananthapuram: ['Kowdiar', 'Vellayambalam', 'Technopark', 'Kazhakkoottam']
        }
      },
      Kozhikode: {
        talukas: {
          Kozhikode: ['Mavoor Road', 'Palayam', 'Nadakkavu']
        }
      },
      Thrissur: {
        talukas: {
          Thrissur: ['Round South', 'Ayyanthole', 'Puzhakkal']
        }
      },
      Kottayam: {
        talukas: {
          Kottayam: ['Collectorate Area', 'Nagampadam', 'Kanjikuzhy']
        }
      }
    }
  },

  OD: {
    name: 'Odisha',
    districts: {
      'Khordha (Bhubaneswar)': {
        talukas: {
          Bhubaneswar: ['Patia', 'Chandrasekharpur', 'Infocity', 'Jayadev Vihar'],
          Jatni: ['Jatni Town', 'IIT Bhubaneswar Area'],
          Khordha: ['Khordha Town', 'Palla']
        }
      },
      Cuttack: {
        talukas: {
          Cuttack: ['Badambadi', 'Link Road', 'CDA Sector 9']
        }
      },
      'Sundargarh (Rourkela)': {
        talukas: {
          Rourkela: ['Civil Township', 'Panposh', 'Udit Nagar']
        }
      },
      Puri: {
        talukas: {
          Puri: ['Grand Road', 'VIP Road', 'Balighai']
        }
      },
      Ganjam: {
        talukas: {
          Berhampur: ['Gandhi Nagar', 'Courtpeta', 'Gopalpur']
        }
      }
    }
  },

  JH: {
    name: 'Jharkhand',
    districts: {
      Ranchi: {
        talukas: {
          Ranchi: ['Main Road', 'Harmu', 'Kanke', 'Morabadi', 'Dhurwa']
        }
      },
      'East Singhbhum (Jamshedpur)': {
        talukas: {
          Jamshedpur: ['Bistupur', 'Sakchi', 'Kadma', 'Sonari', 'Telco']
        }
      },
      Dhanbad: {
        talukas: {
          Dhanbad: ['Bank More', 'Hirapur', 'Saraidhela']
        }
      },
      Bokaro: {
        talukas: {
          Chas: ['Sector 4', 'Sector 1', 'City Centre Chas']
        }
      }
    }
  },

  CG: {
    name: 'Chhattisgarh',
    districts: {
      Raipur: {
        talukas: {
          Raipur: ['Civil Lines', 'Pandri', 'VIP Road', 'Nava Raipur']
        }
      },
      'Durg (Bhilai)': {
        talukas: {
          Durg: ['Civic Centre Bhilai', 'Sector 6', 'Nehru Nagar']
        }
      },
      Bilaspur: {
        talukas: {
          Bilaspur: ['Vyapar Vihar', 'Civil Lines', 'Mangla']
        }
      }
    }
  },

  GA: {
    name: 'Goa',
    districts: {
      'North Goa': {
        talukas: {
          'Tiswadi (Panaji)': ['Panaji', 'Miramar', 'Taleigao', 'Ribandar'],
          'Bardez (Mapusa)': ['Mapusa', 'Calangute', 'Candolim', 'Porvorim'],
          Pernem: ['Pernem Town', 'Mandrem', 'Morjim']
        }
      },
      'South Goa': {
        talukas: {
          Salcete: ['Margao', 'Colva', 'Benaulim', 'Navelim'],
          Mormugao: ['Vasco da Gama', 'Chicalim', 'Dabolim']
        }
      }
    }
  },

  UK: {
    name: 'Uttarakhand',
    districts: {
      Dehradun: {
        talukas: {
          Dehradun: ['Rajpur Road', 'Jakhan', 'Sahastradhara Road', 'Vasant Vihar'],
          Rishikesh: ['Rishikesh Town', 'Tapovan', 'Muni Ki Reti']
        }
      },
      Haridwar: {
        talukas: {
          Haridwar: ['Ranipur', 'Jwalapur', 'SIDCUL Haridwar']
        }
      },
      Nainital: {
        talukas: {
          Haldwani: ['Haldwani Town', 'Kathgodam', 'Kaladhungi Road']
        }
      },
      'Udham Singh Nagar': {
        talukas: {
          Rudrapur: ['SIDCUL Pantnagar', 'Civil Lines', 'Kashipur']
        }
      }
    }
  },

  HP: {
    name: 'Himachal Pradesh',
    districts: {
      Shimla: {
        talukas: {
          Shimla: ['The Mall', 'Chotta Shimla', 'Sanjauli', 'Kasumpti']
        }
      },
      'Kangra (Dharamshala)': {
        talukas: {
          Dharamshala: ['Kotwali Bazar', 'McLeod Ganj', 'Dharamsala Cantt']
        }
      },
      Solan: {
        talukas: {
          Solan: ['Mall Road', 'Chambaghat', 'Baddi Industrial Area']
        }
      },
      Kullu: {
        talukas: {
          Kullu: ['Kullu Town', 'Manali', 'Bhuntar']
        }
      }
    }
  },

  JK: {
    name: 'Jammu and Kashmir',
    districts: {
      Srinagar: {
        talukas: {
          Srinagar: ['Lal Chowk', 'Rajbagh', 'Karan Nagar', 'Dalgate']
        }
      },
      Jammu: {
        talukas: {
          Jammu: ['Gandhi Nagar', 'Trikuta Nagar', 'Channi Himmat']
        }
      },
      Baramulla: {
        talukas: {
          Baramulla: ['Baramulla Town', 'Gulmarg Road', 'Sopore']
        }
      },
      Udhampur: {
        talukas: {
          Udhampur: ['Udhampur Town', 'Dhar Road']
        }
      }
    }
  },

  AS: {
    name: 'Assam',
    districts: {
      'Kamrup Metropolitan (Guwahati)': {
        talukas: {
          Guwahati: ['GS Road', 'Dispur', 'Panbazar', 'Paltan Bazar', 'Zoo Road', 'Six Mile']
        }
      },
      Dibrugarh: {
        talukas: {
          Dibrugarh: ['Graham Bazar', 'Chowkidinghee', 'Amolapatty']
        }
      },
      'Cachar (Silchar)': {
        talukas: {
          Silchar: ['Tarapur', 'Rangirkhari', 'Ambicapatty']
        }
      },
      Jorhat: {
        talukas: {
          Jorhat: ['Gar Ali', 'Na-Ali', 'Tarajan']
        }
      }
    }
  }
};

/**
 * Resolves canonical district name using case-insensitivity, aliases, and partial matching.
 */
export function getCanonicalDistrictName(stateQuery: string, districtQuery: string): string | null {
  if (!stateQuery || !districtQuery) return null;
  const stateCode = normalizeStateCode(stateQuery);
  const stateData = STATE_REVENUE_HIERARCHY[stateCode];
  if (!stateData) return null;

  const normalizedDistrictQuery = districtQuery.trim().toLowerCase();

  // 1. Check known aliases for this state
  const stateAliases = DISTRICT_ALIASES[stateCode];
  if (stateAliases && stateAliases[normalizedDistrictQuery]) {
    const aliasTarget = stateAliases[normalizedDistrictQuery];
    if (stateData.districts[aliasTarget]) {
      return aliasTarget;
    }
  }

  // 2. Exact case-insensitive match
  const districtKeys = Object.keys(stateData.districts);
  for (const districtKey of districtKeys) {
    if (districtKey.toLowerCase() === normalizedDistrictQuery) {
      return districtKey;
    }
  }

  // 3. Substring match (e.g. "Gautam Buddha Nagar" matches "Gautam Buddha Nagar (Noida)")
  for (const districtKey of districtKeys) {
    const lowerKey = districtKey.toLowerCase();
    if (lowerKey.includes(normalizedDistrictQuery) || normalizedDistrictQuery.includes(lowerKey)) {
      return districtKey;
    }
  }

  return null;
}

/**
 * Resolves canonical taluka name and parent district using case-insensitivity and hierarchical lookup.
 */
export function getCanonicalTalukaInfo(
  stateQuery: string,
  districtQuery: string | undefined | null,
  talukaQuery: string
): { district: string; taluka: string } | null {
  if (!stateQuery || !talukaQuery) return null;
  const stateCode = normalizeStateCode(stateQuery);
  const stateData = STATE_REVENUE_HIERARCHY[stateCode];
  if (!stateData) return null;

  const normalizedTaluka = talukaQuery.trim().toLowerCase();

  // If district is provided, search inside that district first
  if (districtQuery && districtQuery.trim()) {
    const canonicalDistrict = getCanonicalDistrictName(stateCode, districtQuery.trim());
    if (canonicalDistrict && stateData.districts[canonicalDistrict]) {
      const talukas = stateData.districts[canonicalDistrict].talukas;
      for (const talukaKey of Object.keys(talukas)) {
        if (talukaKey.toLowerCase() === normalizedTaluka) {
          return { district: canonicalDistrict, taluka: talukaKey };
        }
      }
      for (const talukaKey of Object.keys(talukas)) {
        const lowerKey = talukaKey.toLowerCase();
        if (lowerKey.includes(normalizedTaluka) || normalizedTaluka.includes(lowerKey)) {
          return { district: canonicalDistrict, taluka: talukaKey };
        }
      }
    }
  }

  // If district is omitted or not found, search across ALL districts in the state
  for (const districtKey of Object.keys(stateData.districts)) {
    const talukas = stateData.districts[districtKey].talukas;
    for (const talukaKey of Object.keys(talukas)) {
      if (talukaKey.toLowerCase() === normalizedTaluka) {
        return { district: districtKey, taluka: talukaKey };
      }
    }
  }

  // Partial search across ALL districts
  for (const districtKey of Object.keys(stateData.districts)) {
    const talukas = stateData.districts[districtKey].talukas;
    for (const talukaKey of Object.keys(talukas)) {
      const lowerKey = talukaKey.toLowerCase();
      if (lowerKey.includes(normalizedTaluka) || normalizedTaluka.includes(lowerKey)) {
        return { district: districtKey, taluka: talukaKey };
      }
    }
  }

  return null;
}

/**
 * Resolves list of districts for a given state code or state name.
 * Returns empty array [] if state is not found.
 */
export function getDistrictsForState(state: string): string[] {
  if (!state || !state.trim()) return [];
  const stateCode = normalizeStateCode(state);
  const stateData = STATE_REVENUE_HIERARCHY[stateCode];
  if (!stateData || !stateData.districts) {
    return [];
  }
  return Object.keys(stateData.districts);
}

/**
 * Resolves list of talukas for a given district in a state.
 * Returns empty array [] if state or district is not found.
 */
export function getTalukasForDistrict(state: string, district: string): string[] {
  if (!state || !district || !state.trim() || !district.trim()) return [];
  const stateCode = normalizeStateCode(state);
  const canonicalDistrict = getCanonicalDistrictName(stateCode, district.trim());
  if (!canonicalDistrict) {
    return [];
  }
  const districtData = STATE_REVENUE_HIERARCHY[stateCode]?.districts[canonicalDistrict];
  if (!districtData || !districtData.talukas) {
    return [];
  }
  return Object.keys(districtData.talukas);
}

/**
 * Resolves list of villages for a given taluka in a state (and optionally district).
 * Handles both:
 * - getVillagesForTaluka(state, district, taluka)
 * - getVillagesForTaluka(state, taluka)
 * Returns empty array [] if taluka is not found.
 */
export function getVillagesForTaluka(state: string, taluka: string): string[];
export function getVillagesForTaluka(state: string, district: string | undefined | null, taluka: string): string[];
export function getVillagesForTaluka(state: string, arg2?: string | null, arg3?: string): string[] {
  if (!state) return [];

  let districtQuery: string | undefined;
  let talukaQuery: string;

  if (typeof arg3 === 'string') {
    districtQuery = arg2 && arg2.trim() ? arg2.trim() : undefined;
    talukaQuery = arg3.trim();
  } else if (typeof arg2 === 'string') {
    districtQuery = undefined;
    talukaQuery = arg2.trim();
  } else {
    return [];
  }

  if (!talukaQuery) return [];

  const stateCode = normalizeStateCode(state);
  const talukaInfo = getCanonicalTalukaInfo(stateCode, districtQuery, talukaQuery);
  if (!talukaInfo) {
    return [];
  }

  const villages = STATE_REVENUE_HIERARCHY[stateCode]?.districts[talukaInfo.district]?.talukas[talukaInfo.taluka];
  return villages || [];
}
