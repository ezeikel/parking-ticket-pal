export const CONTRAVENTION_CODES = {
  '01': {
    code: '01',
    description: 'Parked in a restricted street during prescribed hours',
    suffixes: ['a', 'j', 'o', 'y', 'z'],
    notes:
      'Code-specific suffixes apply. Suffixes y and z for disabled badge holders only.',
  },
  '02': {
    code: '02',
    description:
      'Parked or loading/unloading in a restricted street where waiting and loading/unloading restrictions are in force',
    suffixes: ['a', 'j', 'o'],
    notes: 'Code-specific suffixes apply.',
  },
  '12': {
    code: '12',
    description:
      "Parked in a residents' or shared use parking place or zone without a valid virtual permit or clearly displaying a valid physical permit or voucher or pay and display ticket issued for that place where required, or without payment of the parking charge",
    suffixes: ['a', 'r', 's', 't', 'u', 'w', 'y', '4'],
    notes: 'Code-specific suffixes apply.',
  },
  '14': {
    code: '14',
    description:
      "Parked in an electric vehicles' charging place during restricted hours without charging",
    suffixes: ['a', 'y', '8', '9'],
    notes: '',
  },
  '16': {
    code: '16',
    description:
      'Parked in a permit space or zone without a valid virtual permit or clearly displaying a valid physical permit where required',
    suffixes: [
      'a',
      'b',
      'd',
      'e',
      'h',
      'q',
      's',
      't',
      'w',
      'x',
      'y',
      'z',
      '4',
      '5',
      '6',
      '9',
    ],
    notes:
      "Code-specific suffixes apply. Suffix 's' only for use where bay is completely non-resident.",
  },
  '18': {
    code: '18',
    description:
      'Using a vehicle in a parking place in connection with the sale or offering or exposing for sale of goods when prohibited',
    suffixes: [
      'a',
      'b',
      'c',
      'd',
      'e',
      'f',
      'g',
      'h',
      'm',
      'p',
      'r',
      's',
      'v',
      'x',
      'y',
      '1',
      '2',
      '3',
      '5',
      '6',
      '7',
      '8',
      '9',
    ],
    notes: '',
  },
  '20': {
    code: '20',
    description:
      'Parked in a part of a parking place marked by a yellow line where waiting is prohibited',
    suffixes: [],
    notes: '',
  },
  '21': {
    code: '21',
    description: 'Parked wholly or partly in a suspended bay or space',
    suffixes: [
      'a',
      'b',
      'c',
      'd',
      'e',
      'f',
      'g',
      'h',
      'l',
      'm',
      'n',
      'p',
      'q',
      'r',
      's',
      'u',
      'v',
      'x',
      'y',
      '1',
      '2',
      '5',
      '6',
      '7',
      '8',
      '9',
    ],
    notes: '',
  },
  '23': {
    code: '23',
    description:
      'Parked in a parking place or area not designated for that class of vehicle',
    suffixes: [
      'a',
      'b',
      'c',
      'd',
      'e',
      'f',
      'g',
      'h',
      'k',
      'l',
      'p',
      'r',
      's',
      'v',
      'w',
      'x',
      'y',
      '1',
      '2',
      '3',
      '7',
      '8',
      '9',
    ],
    notes: 'Suffix required to fully describe contravention',
  },
  '25': {
    code: '25',
    description:
      'Parked in a loading place or bay during restricted hours without loading',
    suffixes: ['n', '2'],
    notes: 'On-street loading bay or place',
  },
  '26': {
    code: '26',
    description:
      'Parked in a special enforcement area more than 50cm from the edge of the carriageway and not within a designated parking place',
    suffixes: ['n'],
    notes: '',
  },
  '27': {
    code: '27',
    description:
      'Parked in a special enforcement area adjacent to a footway, cycle track or verge lowered to meet the level of the carriageway',
    suffixes: ['n', 'o'],
    notes: '',
  },
  '28': {
    code: '28',
    description:
      'Parked in a special enforcement area on part of the carriageway raised to meet the level of a footway, cycle track or verge',
    suffixes: ['n', 'o'],
    notes: '',
  },
  '40': {
    code: '40',
    description:
      "Parked in a designated disabled person's parking place without displaying a valid disabled person's badge",
    suffixes: ['n'],
    notes: '',
  },
  '41': {
    code: '41',
    description:
      'Stopped in a parking place designated for diplomatic vehicles',
    suffixes: [],
    notes: '',
  },
  '42': {
    code: '42',
    description: 'Parked in a parking place designated for police vehicles',
    suffixes: [],
    notes: '',
  },
  '43': {
    code: '43',
    description: 'Stopped on a cycle docking station parking place',
    suffixes: [],
    notes: '',
  },
  '45': {
    code: '45',
    description: 'Stopped on a taxi rank',
    suffixes: ['n', 'w'],
    notes: "'Stopped' may be varied to 'waiting'",
  },
  '46': {
    code: '46',
    description: 'Stopped where prohibited (on a red route or clearway)',
    suffixes: ['n'],
    notes: '',
  },
  '47': {
    code: '47',
    description: 'Stopped on a restricted bus stop or stand',
    suffixes: ['j', 'n'],
    notes: '',
  },
  '48': {
    code: '48',
    description:
      'Stopped in a restricted area outside a school, a hospital or a fire, police or ambulance station when prohibited',
    suffixes: ['j'],
    notes: 'CCTV can be used on a restricted area outside a school only',
  },
  '49': {
    code: '49',
    description: 'Parked wholly or partly on a cycle track or lane',
    suffixes: ['j'],
    notes: '',
  },
  '55': {
    code: '55',
    description:
      'A commercial vehicle parked in a restricted street in contravention of the overnight waiting ban',
    suffixes: [],
    notes: '',
  },
  '56': {
    code: '56',
    description:
      'Parked in contravention of a commercial vehicle waiting restriction',
    suffixes: [],
    notes: 'Non-overnight waiting restriction',
  },
  '57': {
    code: '57',
    description: 'Parked in contravention of a bus ban',
    suffixes: [],
    notes: 'Non-overnight waiting restriction',
  },
  '61': {
    code: '61',
    description:
      'A heavy commercial vehicle wholly or partly parked on a footway, verge or land between two carriageways',
    suffixes: ['1', '2', '4', 'c', 'g', 'n'],
    notes: 'Code-specific suffixes apply',
  },
  '62': {
    code: '62',
    description:
      'Parked with one or more wheels on or over a footpath or any part of a road other than a carriageway',
    suffixes: ['1', '2', '4', 'c', 'g', 'n'],
    notes: 'Code-specific suffixes apply',
  },
  '99': {
    code: '99',
    description:
      'Stopped on a pedestrian crossing or crossing area marked by zigzags',
    suffixes: ['n', 'o'],
    notes: 'Pedestrian crossings',
  },
  '70': {
    code: '70',
    description:
      'Parked in a loading place or bay during restricted hours without loading',
    suffixes: [],
    notes: 'Off-street loading areas',
  },
  '71': {
    code: '71',
    description:
      "Parked in an electric vehicles' charging place during restricted hours without charging",
    suffixes: [],
    notes: 'Off-street car parks',
  },
  '74': {
    code: '74',
    description:
      'Using a vehicle in a parking place in connection with the sale or offering or exposing for sale of goods when prohibited',
    suffixes: ['p', 'r', 's'],
    notes: 'Off-street car parks',
  },
  '78': {
    code: '78',
    description: 'Parked wholly or partly in a suspended bay or space',
    suffixes: [
      'a',
      'b',
      'd',
      'e',
      'f',
      'g',
      'h',
      'k',
      'l',
      'p',
      'q',
      'u',
      'v',
      '1',
      '5',
      '6',
      '7',
      '8',
      '9',
    ],
    notes: 'Off-street car parks',
  },
  '81': {
    code: '81',
    description:
      'Parked in a restricted area in an off-street car park or housing estate',
    suffixes: ['o'],
    notes: 'Off-street car parks',
  },
  '85': {
    code: '85',
    description:
      'Parked without a valid virtual permit or clearly displaying a valid physical permit where required',
    suffixes: ['a', 'b', 't', 'r', 'w', 'y', 'z', '4', '5'],
    notes: 'Off-street car parks. Code-specific suffixes apply',
  },
  '87': {
    code: '87',
    description:
      "Parked in a designated disabled person's parking place without displaying a valid disabled person's badge",
    suffixes: [],
    notes: 'Off-street car parks',
  },
  '89': {
    code: '89',
    description:
      'Vehicle parked exceeds maximum weight or height or length permitted',
    suffixes: [],
    notes: 'Off-street car parks',
  },
  '91': {
    code: '91',
    description:
      'Parked in a car park or area not designated for that class of vehicle',
    suffixes: ['c', 'g'],
    notes: 'Off-street car parks',
  },
  '92': {
    code: '92',
    description: 'Parked causing an obstruction',
    suffixes: ['o'],
    notes: 'Off-street car parks',
  },
} as const;

export const getContraventionDetails = (code: string) => {
  // TODO: add support for suffixes e.g 622 (62 with a suffix of 2)
  const codeData =
    CONTRAVENTION_CODES[code as keyof typeof CONTRAVENTION_CODES];

  if (codeData) {
    return {
      title: codeData.description,
      description: codeData.notes,
    };
  }

  return {
    title: 'Contravention code not found',
    description: 'No details available for this code.',
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
  if (data.suffixes) {
    data.suffixes.forEach((suffix) => {
      options.push({
        value: `${code}${suffix}`,
        label: `${code}${suffix} - ${data.description}`,
      });
    });
  }

  return options;
});