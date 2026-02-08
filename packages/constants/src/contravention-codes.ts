export type PenaltyLevel = 'higher' | 'lower' | 'n/a';
export type CodeCategory = 'on-street' | 'off-street' | 'moving-traffic';

export type ContraventionCode = {
  code: string;
  description: string;
  suffixes: string[];
  penaltyLevel: PenaltyLevel;
  category: CodeCategory;
  notes?: string;
};

// Based on London Councils PCN Codes v7.0 (31 May 2022)
// Source: https://www.londoncouncils.gov.uk/services/parking/parking-appeals/contravention-codes
export const CONTRAVENTION_CODES: Record<string, ContraventionCode> = {
  // ON-STREET CODES
  '01': {
    code: '01',
    description: 'Parked in a restricted street during prescribed hours',
    suffixes: ['a', 'j', 'o', 'y', 'z'],
    penaltyLevel: 'higher',
    category: 'on-street',
    notes: 'Code specific suffixes apply. Suffixes y & z for disabled badge holders only.',
  },
  '02': {
    code: '02',
    description: 'Parked or loading/unloading in a restricted street where waiting and loading/unloading restrictions are in force',
    suffixes: ['a', 'j', 'o'],
    penaltyLevel: 'higher',
    category: 'on-street',
    notes: 'Code specific suffixes apply.',
  },
  '04': {
    code: '04',
    description: 'Parked in a meter bay when penalty time is indicated',
    suffixes: ['c', 's'],
    penaltyLevel: 'lower',
    category: 'on-street',
  },
  '05': {
    code: '05',
    description: 'Parked after the expiry of paid for time',
    suffixes: ['c', 'g', 'p', 's', 'u', 'v', '1'],
    penaltyLevel: 'lower',
    category: 'on-street',
  },
  '06': {
    code: '06',
    description: 'Parked without clearly displaying a valid pay & display ticket or voucher',
    suffixes: ['c', 'i', 'p', 'v', '1'],
    penaltyLevel: 'lower',
    category: 'on-street',
    notes: 'Higher level in Wales',
  },
  '07': {
    code: '07',
    description: 'Parked with payment made to extend the stay beyond initial time',
    suffixes: ['c', 'g', 'm', 'p', 'r', 's', 'u', 'v'],
    penaltyLevel: 'lower',
    category: 'on-street',
    notes: 'Meter feeding',
  },
  '08': {
    code: '08',
    description: 'Parked at an out-of-order meter during controlled hours',
    suffixes: ['c'],
    penaltyLevel: 'lower',
    category: 'on-street',
    notes: 'Electronic meters only',
  },
  '09': {
    code: '09',
    description: 'Parked displaying multiple pay & display tickets where prohibited',
    suffixes: ['p', 's'],
    penaltyLevel: 'lower',
    category: 'on-street',
  },
  '10': {
    code: '10',
    description: 'Parked without clearly displaying two valid pay and display tickets when required',
    suffixes: ['p'],
    penaltyLevel: 'lower',
    category: 'on-street',
    notes: '"Two" may be varied to another number or "multiple"',
  },
  '11': {
    code: '11',
    description: 'Parked without payment of the parking charge',
    suffixes: ['g', 'u'],
    penaltyLevel: 'lower',
    category: 'on-street',
  },
  '12': {
    code: '12',
    description: "Parked in a residents' or shared use parking place or zone without a valid virtual permit or clearly displaying a valid physical permit or voucher or pay and display ticket issued for that place where required, or without payment of the parking charge",
    suffixes: ['a', 'r', 's', 't', 'u', 'w', 'y', '4'],
    penaltyLevel: 'higher',
    category: 'on-street',
    notes: 'Code specific suffixes apply',
  },
  '14': {
    code: '14',
    description: "Parked in an electric vehicles' charging place during restricted hours without charging",
    suffixes: ['a', 'y', '8', '9'],
    penaltyLevel: 'higher',
    category: 'on-street',
  },
  '16': {
    code: '16',
    description: 'Parked in a permit space or zone without a valid virtual permit or clearly displaying a valid physical permit where required',
    suffixes: ['a', 'b', 'd', 'e', 'h', 'q', 's', 't', 'w', 'x', 'y', 'z', '4', '5', '6', '9'],
    penaltyLevel: 'higher',
    category: 'on-street',
    notes: 'Code specific suffixes apply. Suffix "s" only for use where bay is completely non-resident',
  },
  '18': {
    code: '18',
    description: 'Using a vehicle in a parking place in connection with the sale or offering or exposing for sale of goods when prohibited',
    suffixes: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'm', 'p', 'r', 's', 'v', 'x', 'y', '1', '2', '3', '5', '6', '7', '8', '9'],
    penaltyLevel: 'higher',
    category: 'on-street',
  },
  '19': {
    code: '19',
    description: "Parked in a residents' or shared use parking place or zone with an invalid virtual permit or displaying an invalid physical permit or voucher or pay and display ticket, or after the expiry of paid for time",
    suffixes: ['a', 'i', 'r', 's', 'u', 'w', 'x', 'y', 'z', '4'],
    penaltyLevel: 'lower',
    category: 'on-street',
    notes: 'Code specific suffixes apply',
  },
  '20': {
    code: '20',
    description: 'Parked in a part of a parking place marked by a yellow line where waiting is prohibited',
    suffixes: [],
    penaltyLevel: 'higher',
    category: 'on-street',
  },
  '21': {
    code: '21',
    description: 'Parked wholly or partly in a suspended bay or space',
    suffixes: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'l', 'm', 'n', 'p', 'q', 'r', 's', 'u', 'v', 'x', 'y', '1', '2', '5', '6', '7', '8', '9'],
    penaltyLevel: 'higher',
    category: 'on-street',
  },
  '22': {
    code: '22',
    description: 'Re-parked in the same parking place or zone within one hour after leaving',
    suffixes: ['c', 'f', 'g', 'l', 'm', 'n', 'o', 'p', 's', 'v', '1', '2', '8', '9'],
    penaltyLevel: 'lower',
    category: 'on-street',
    notes: '"One hour" may be varied to another time period or "the prescribed time period"',
  },
  '23': {
    code: '23',
    description: 'Parked in a parking place or area not designated for that class of vehicle',
    suffixes: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'k', 'l', 'p', 'r', 's', 'v', 'w', 'x', 'y', '1', '2', '3', '7', '8', '9'],
    penaltyLevel: 'higher',
    category: 'on-street',
    notes: 'Suffix required to fully describe contravention',
  },
  '24': {
    code: '24',
    description: 'Not parked correctly within the markings of the bay or space',
    suffixes: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'l', 'm', 'p', 'q', 'r', 's', 'v', 'x', 'y', '1', '2', '5', '6', '7', '8', '9'],
    penaltyLevel: 'lower',
    category: 'on-street',
  },
  '25': {
    code: '25',
    description: 'Parked in a loading place or bay during restricted hours without loading',
    suffixes: ['n', '2'],
    penaltyLevel: 'higher',
    category: 'on-street',
    notes: 'On-street loading bay or place',
  },
  '26': {
    code: '26',
    description: 'Parked in a special enforcement area more than 50cm from the edge of the carriageway and not within a designated parking place',
    suffixes: ['n'],
    penaltyLevel: 'higher',
    category: 'on-street',
    notes: '"50 cm" may be varied to another distance in Scotland',
  },
  '27': {
    code: '27',
    description: 'Parked in a special enforcement area adjacent to a footway, cycle track or verge lowered to meet the level of the carriageway',
    suffixes: ['n', 'o'],
    penaltyLevel: 'higher',
    category: 'on-street',
  },
  '28': {
    code: '28',
    description: 'Parked in a special enforcement area on part of the carriageway raised to meet the level of a footway, cycle track or verge',
    suffixes: ['n', 'o'],
    penaltyLevel: 'higher',
    category: 'on-street',
  },
  '30': {
    code: '30',
    description: 'Parked for longer than permitted',
    suffixes: ['a', 'c', 'f', 'g', 'l', 'm', 'n', 'o', 'p', 's', 'u', 'y', '1', '2', '7', '8', '9'],
    penaltyLevel: 'lower',
    category: 'on-street',
  },
  '35': {
    code: '35',
    description: 'Parked in a disc parking place without clearly displaying a valid disc',
    suffixes: [],
    penaltyLevel: 'lower',
    category: 'on-street',
  },
  '40': {
    code: '40',
    description: "Parked in a designated disabled person's parking place without displaying a valid disabled person's badge in the prescribed manner",
    suffixes: ['n'],
    penaltyLevel: 'higher',
    category: 'on-street',
  },
  '41': {
    code: '41',
    description: 'Stopped in a parking place designated for diplomatic vehicles',
    suffixes: [],
    penaltyLevel: 'higher',
    category: 'on-street',
  },
  '42': {
    code: '42',
    description: 'Parked in a parking place designated for police vehicles',
    suffixes: [],
    penaltyLevel: 'higher',
    category: 'on-street',
  },
  '43': {
    code: '43',
    description: 'Stopped on a cycle docking station parking place',
    suffixes: [],
    penaltyLevel: 'higher',
    category: 'on-street',
  },
  '45': {
    code: '45',
    description: 'Stopped on a taxi rank',
    suffixes: ['n', 'w'],
    penaltyLevel: 'higher',
    category: 'on-street',
    notes: '"Stopped" may be varied to "waiting"',
  },
  '46': {
    code: '46',
    description: 'Stopped where prohibited (on a red route or clearway)',
    suffixes: ['n'],
    penaltyLevel: 'higher',
    category: 'on-street',
  },
  '47': {
    code: '47',
    description: 'Stopped on a restricted bus stop or stand',
    suffixes: ['j', 'n'],
    penaltyLevel: 'higher',
    category: 'on-street',
  },
  '48': {
    code: '48',
    description: 'Stopped in a restricted area outside a school, a hospital or a fire, police or ambulance station when prohibited',
    suffixes: ['j'],
    penaltyLevel: 'higher',
    category: 'on-street',
    notes: 'CCTV can be used on a restricted area outside a school only',
  },
  '49': {
    code: '49',
    description: 'Parked wholly or partly on a cycle track or lane',
    suffixes: ['j'],
    penaltyLevel: 'higher',
    category: 'on-street',
  },
  '55': {
    code: '55',
    description: 'A commercial vehicle parked in a restricted street in contravention of the Overnight Waiting Ban',
    suffixes: [],
    penaltyLevel: 'higher',
    category: 'on-street',
  },
  '56': {
    code: '56',
    description: 'Parked in contravention of a commercial vehicle waiting restriction',
    suffixes: [],
    penaltyLevel: 'higher',
    category: 'on-street',
    notes: 'Non-overnight waiting restriction',
  },
  '57': {
    code: '57',
    description: 'Parked in contravention of a bus ban',
    suffixes: [],
    penaltyLevel: 'higher',
    category: 'on-street',
    notes: 'Non-overnight waiting restriction',
  },
  '61': {
    code: '61',
    description: 'A heavy commercial vehicle wholly or partly parked on a footway, verge or land between two carriageways',
    suffixes: ['1', '2', '4', 'c', 'g', 'n'],
    penaltyLevel: 'higher',
    category: 'on-street',
    notes: 'Code-specific suffixes apply',
  },
  '62': {
    code: '62',
    description: 'Parked with one or more wheels on or over a footpath or any part of a road other than a carriageway',
    suffixes: ['1', '2', '4', 'c', 'g', 'n'],
    penaltyLevel: 'higher',
    category: 'on-street',
    notes: 'Code-specific suffixes apply',
  },
  '63': {
    code: '63',
    description: 'Parked with engine running where prohibited',
    suffixes: [],
    penaltyLevel: 'lower',
    category: 'on-street',
  },
  '99': {
    code: '99',
    description: 'Stopped on a pedestrian crossing or crossing area marked by zigzags',
    suffixes: ['n', 'o'],
    penaltyLevel: 'higher',
    category: 'on-street',
    notes: 'Pedestrian crossings',
  },

  // MOVING TRAFFIC CODES
  '29': {
    code: '29',
    description: 'Failing to comply with a one-way restriction',
    suffixes: ['j'],
    penaltyLevel: 'n/a',
    category: 'moving-traffic',
  },
  '31': {
    code: '31',
    description: 'Entering and stopping in a box junction when prohibited',
    suffixes: ['j'],
    penaltyLevel: 'n/a',
    category: 'moving-traffic',
  },
  '32': {
    code: '32',
    description: 'Failing to proceed in the direction shown by the arrow on a blue sign',
    suffixes: ['j', 'd', 't'],
    penaltyLevel: 'n/a',
    category: 'moving-traffic',
    notes: 'Code-specific suffixes apply',
  },
  '33': {
    code: '33',
    description: 'Using a route restricted to certain vehicles',
    suffixes: ['j', 'b', 'c', 'e', 'f', 'g', 'h', 'i', 'k', 'q', 'r', 's', 'y', 'z'],
    penaltyLevel: 'n/a',
    category: 'moving-traffic',
    notes: 'Code-specific suffixes apply',
  },
  '34': {
    code: '34',
    description: 'Being in a bus lane',
    suffixes: ['j', '0'],
    penaltyLevel: 'n/a',
    category: 'moving-traffic',
  },
  '36': {
    code: '36',
    description: 'Being in a mandatory cycle lane',
    suffixes: ['j'],
    penaltyLevel: 'n/a',
    category: 'moving-traffic',
  },
  '37': {
    code: '37',
    description: 'Failing to give way to oncoming vehicles',
    suffixes: ['j'],
    penaltyLevel: 'n/a',
    category: 'moving-traffic',
  },
  '38': {
    code: '38',
    description: 'Failing to comply with a sign indicating that vehicular traffic must pass to the specified side of the sign',
    suffixes: ['j', 'l', 'r'],
    penaltyLevel: 'n/a',
    category: 'moving-traffic',
    notes: 'Code-specific suffixes apply',
  },
  '50': {
    code: '50',
    description: 'Performing a prohibited turn',
    suffixes: ['j', 'l', 'r', 'u'],
    penaltyLevel: 'n/a',
    category: 'moving-traffic',
    notes: 'Code-specific suffixes apply',
  },
  '51': {
    code: '51',
    description: 'Failing to comply with a no entry restriction',
    suffixes: ['j'],
    penaltyLevel: 'n/a',
    category: 'moving-traffic',
  },
  '52': {
    code: '52',
    description: 'Failing to comply with a prohibition on certain types of vehicle',
    suffixes: ['j', 'g', 'm', 's', 'v', 'x'],
    penaltyLevel: 'n/a',
    category: 'moving-traffic',
    notes: 'Code-specific suffixes apply',
  },
  '53': {
    code: '53',
    description: 'Failing to comply with a restriction on vehicles entering a pedestrian zone',
    suffixes: ['c', 'j'],
    penaltyLevel: 'n/a',
    category: 'moving-traffic',
    notes: '"and cycle" may be added',
  },
  '54': {
    code: '54',
    description: 'Failing to comply with a restriction on vehicles entering and waiting in a pedestrian zone',
    suffixes: ['c', 'j'],
    penaltyLevel: 'n/a',
    category: 'moving-traffic',
    notes: '"and cycle" may be added',
  },

  // OFF-STREET CODES
  '70': {
    code: '70',
    description: 'Parked in a loading place or bay during restricted hours without loading',
    suffixes: [],
    penaltyLevel: 'higher',
    category: 'off-street',
    notes: 'Off-street loading areas',
  },
  '71': {
    code: '71',
    description: "Parked in an electric vehicles' charging place during restricted hours without charging",
    suffixes: [],
    penaltyLevel: 'higher',
    category: 'off-street',
    notes: 'Off-street car parks',
  },
  '73': {
    code: '73',
    description: 'Parked without payment of the parking charge',
    suffixes: ['g', 'u'],
    penaltyLevel: 'lower',
    category: 'off-street',
    notes: 'Off-street car parks',
  },
  '74': {
    code: '74',
    description: 'Using a vehicle in a parking place in connection with the sale or offering or exposing for sale of goods when prohibited',
    suffixes: ['p', 'r', 's'],
    penaltyLevel: 'higher',
    category: 'off-street',
    notes: 'Off-street car parks',
  },
  '78': {
    code: '78',
    description: 'Parked wholly or partly in a suspended bay or space',
    suffixes: ['a', 'b', 'd', 'e', 'f', 'g', 'h', 'k', 'l', 'p', 'q', 'u', 'v', '1', '5', '6', '7', '8', '9'],
    penaltyLevel: 'higher',
    category: 'off-street',
    notes: 'Off-street car parks',
  },
  '80': {
    code: '80',
    description: 'Parked for longer than permitted',
    suffixes: ['g', 'u'],
    penaltyLevel: 'lower',
    category: 'off-street',
    notes: 'Off-street car parks',
  },
  '81': {
    code: '81',
    description: 'Parked in a restricted area in an off-street car park or housing estate',
    suffixes: ['o'],
    penaltyLevel: 'higher',
    category: 'off-street',
    notes: 'Off-street car parks',
  },
  '82': {
    code: '82',
    description: 'Parked after the expiry of paid for time',
    suffixes: ['p', 'u', 'v', '4'],
    penaltyLevel: 'lower',
    category: 'off-street',
    notes: 'Off-street car parks',
  },
  '83': {
    code: '83',
    description: 'Parked in a car park without clearly displaying a valid pay & display ticket or voucher or parking clock',
    suffixes: ['4'],
    penaltyLevel: 'lower',
    category: 'off-street',
    notes: 'Off-street car parks',
  },
  '84': {
    code: '84',
    description: 'Parked with payment made to extend the stay beyond initial time',
    suffixes: ['g', 'u'],
    penaltyLevel: 'lower',
    category: 'off-street',
    notes: 'Off-street car parks',
  },
  '85': {
    code: '85',
    description: 'Parked without a valid virtual permit or clearly displaying a valid physical permit where required',
    suffixes: ['a', 'b', 't', 'r', 'w', 'y', 'z', '4', '5'],
    penaltyLevel: 'higher',
    category: 'off-street',
    notes: 'Off-street car parks. Code specific suffixes apply',
  },
  '86': {
    code: '86',
    description: 'Not parked correctly within the markings of a bay or space',
    suffixes: ['p', 'r', 's'],
    penaltyLevel: 'lower',
    category: 'off-street',
    notes: 'Off-street car parks',
  },
  '87': {
    code: '87',
    description: "Parked in a designated disabled person's parking place without displaying a valid disabled person's badge in the prescribed manner",
    suffixes: [],
    penaltyLevel: 'higher',
    category: 'off-street',
    notes: 'Off-street car parks',
  },
  '89': {
    code: '89',
    description: 'Vehicle parked exceeds maximum weight or height or length permitted',
    suffixes: [],
    penaltyLevel: 'higher',
    category: 'off-street',
    notes: 'Off-street car parks',
  },
  '90': {
    code: '90',
    description: 'Re-parked in the same car park within one hour after leaving',
    suffixes: ['p', 's', 'u', 'v'],
    penaltyLevel: 'lower',
    category: 'off-street',
    notes: 'Off-street car parks. "One hour" may be varied to another time period',
  },
  '91': {
    code: '91',
    description: 'Parked in a car park or area not designated for that class of vehicle',
    suffixes: ['c', 'g'],
    penaltyLevel: 'higher',
    category: 'off-street',
    notes: 'Off-street car parks',
  },
  '92': {
    code: '92',
    description: 'Parked causing an obstruction',
    suffixes: ['o'],
    penaltyLevel: 'higher',
    category: 'off-street',
    notes: 'Off-street car parks',
  },
  '93': {
    code: '93',
    description: 'Parked in car park when closed',
    suffixes: [],
    penaltyLevel: 'lower',
    category: 'off-street',
    notes: 'Off-street car parks',
  },
  '94': {
    code: '94',
    description: 'Parked in a pay & display car park without clearly displaying two valid pay and display tickets when required',
    suffixes: ['p'],
    penaltyLevel: 'lower',
    category: 'off-street',
    notes: 'Off-street car parks. "Two" may be varied to another number or "multiple"',
  },
  '95': {
    code: '95',
    description: 'Parked in a parking place for a purpose other than that designated',
    suffixes: [],
    penaltyLevel: 'lower',
    category: 'off-street',
    notes: 'Off-street car parks',
  },
  '96': {
    code: '96',
    description: 'Parked with engine running where prohibited',
    suffixes: [],
    penaltyLevel: 'lower',
    category: 'off-street',
    notes: 'Off-street car parks',
  },
} as const;

// General suffix definitions
export const SUFFIX_DEFINITIONS: Record<string, string> = {
  'a': 'Permit holder only electric vehicle charging bay',
  'b': 'Business bay',
  'c': 'Buses only',
  'd': "Doctor's bay",
  'e': 'Car club bay',
  'f': 'Free parking bay',
  'g': 'Motorcycle bay',
  'h': 'Hospital bay',
  'i': 'Wrong type of voucher',
  'j': 'Camera enforcement',
  'k': 'Ambulance bay',
  'l': 'Loading place',
  'm': 'Parking meter',
  'n': 'Red route',
  'o': 'Blue badge holder',
  'p': 'Pay & display',
  'q': "Market traders' bay",
  'r': "Residents' bay",
  's': 'Shared use bay',
  't': 'Voucher/P&D ticket used in permit bay',
  'u': 'Electronic payment',
  'v': 'Voucher',
  'w': 'E-scooter bay',
  'x': 'Disabled bay',
  'y': 'Electric solo motorcycle bay',
  '0': 'Local buses / trams only',
  '1': 'Electric vehicles bay',
  '2': 'Goods vehicle loading bays',
  '3': 'Bicycle bay',
  '4': 'Virtual permit',
  '5': 'Dedicated disabled bay',
  '6': 'Hotel bay',
  '7': 'Taxis only',
  '8': 'Zero emission capable taxis only',
  '9': 'Electric vehicle car club bay',
};

export const getContraventionDetails = (code: string) => {
  // Handle codes with suffixes (e.g., "62n", "01a")
  const baseCode = code.replace(/[a-z0-9]$/i, '');
  const suffix = code.slice(baseCode.length);

  const codeData = CONTRAVENTION_CODES[baseCode] || CONTRAVENTION_CODES[code];

  if (codeData) {
    let description = codeData.description;
    if (suffix && SUFFIX_DEFINITIONS[suffix.toLowerCase()]) {
      description += ` (${SUFFIX_DEFINITIONS[suffix.toLowerCase()]})`;
    }

    return {
      code: code,
      title: description,
      description: codeData.notes || '',
      penaltyLevel: codeData.penaltyLevel,
      category: codeData.category,
    };
  }

  return {
    code: code,
    title: 'Contravention code not found',
    description: 'No details available for this code.',
    penaltyLevel: 'n/a' as PenaltyLevel,
    category: 'on-street' as CodeCategory,
  };
};

export const CONTRAVENTION_CODES_OPTIONS: ReadonlyArray<{
  value: string;
  label: string;
}> = Object.entries(CONTRAVENTION_CODES).flatMap(([code, data]) => {
  // Create base code option
  const options = [
    {
      value: code,
      label: `${code} - ${data.description}`,
    },
  ];

  // Add suffix variations
  if (data.suffixes && data.suffixes.length > 0) {
    data.suffixes.forEach((suffix) => {
      options.push({
        value: `${code}${suffix}`,
        label: `${code}${suffix} - ${data.description}`,
      });
    });
  }

  return options;
});

// Helper to get codes by category
export const getCodesByCategory = (category: CodeCategory) => {
  return Object.values(CONTRAVENTION_CODES).filter(code => code.category === category);
};

// Helper to get codes by penalty level
export const getCodesByPenaltyLevel = (level: PenaltyLevel) => {
  return Object.values(CONTRAVENTION_CODES).filter(code => code.penaltyLevel === level);
};
