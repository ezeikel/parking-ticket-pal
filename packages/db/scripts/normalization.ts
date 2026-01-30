/**
 * Normalization mappings for London Tribunal data
 *
 * Maps raw authority names and contravention descriptions to normalized IDs
 * that match our internal issuer IDs and contravention codes.
 */

// Authority name -> Normalized issuer ID
export const AUTHORITY_TO_ISSUER: Record<string, string> = {
  // Transport for London
  'Transport for London': 'tfl',

  // London Boroughs
  'London Borough of Barking and Dagenham': 'barking-and-dagenham',
  'London Borough of Barnet': 'barnet',
  'London Borough of Bexley': 'bexley',
  'London Borough of Brent': 'brent',
  'London Borough of Bromley': 'bromley',
  'London Borough of Camden': 'camden',
  'London Borough of Croydon': 'croydon',
  'London Borough of Ealing': 'ealing',
  'London Borough of Enfield': 'enfield',
  'London Borough of Hackney': 'hackney',
  'London Borough of Hammersmith and Fulham': 'hammersmith-and-fulham',
  'London Borough of Haringey': 'haringey',
  'London Borough of Harrow': 'harrow',
  'London Borough of Havering': 'havering',
  'London Borough of Hillingdon': 'hillingdon',
  'London Borough of Hounslow': 'hounslow',
  'London Borough of Islington': 'islington',
  'London Borough of Lambeth': 'lambeth',
  'London Borough of Lewisham': 'lewisham',
  'London Borough of Merton': 'merton',
  'London Borough of Newham': 'newham',
  'London Borough of Redbridge': 'redbridge',
  'London Borough of Richmond Upon Thames': 'richmond-upon-thames',
  'London Borough of Southwark': 'southwark',
  'London Borough of Sutton': 'sutton',
  'London Borough of Tower Hamlets': 'tower-hamlets',
  'London Borough of Waltham Forest': 'waltham-forest',
  'London Borough of Wandsworth': 'wandsworth',

  // Royal Boroughs
  'Royal Borough of Greenwich': 'greenwich',
  'Royal Borough of Kensington and Chelsea': 'kensington-and-chelsea',
  'Royal Borough of Kingston Upon Thames': 'kingston-upon-thames',

  // Cities
  'City of Westminster': 'westminster',
  'City of London': 'city-of-london',

  // Other
  'London Councils': 'london-councils', // Umbrella organization
};

// Contravention description -> Normalized contravention code
export const CONTRAVENTION_TO_CODE: Record<string, string> = {
  // === PARKING CONTRAVENTIONS (On-street) ===

  // Code 01 - Restricted street
  'Parked restricted street during prescribed hours': '01',
  'Parked in a restricted street during prescribed hours': '01',

  // Code 02 - Loading ban
  'Parked or loading/unloading during a loading ban': '02',

  // Code 12 - Resident/shared use permit
  'Parked resident/shared use without a valid permit': '12',
  'Parked res/sh use - invalid permit/after paid time': '12',
  'Parked without payment of the parking charge': '12',
  'Parked after the expiry of paid for time': '12',

  // Code 14 - Electric vehicle charging
  'Parked electric car charging place not charging': '14',
  'Parked in electric veh charging place w/o charging': '14',

  // Code 16 - Permit space
  'Parked in permit space without a valid permit': '16',
  'Parked without a valid permit where required': '16',

  // Code 21 - Suspended bay
  'Parked wholly/partly in a suspended bay or space': '21',

  // Code 23 - Wrong class of vehicle
  'Parked - place not designated for class of vehicle': '23',

  // Code 25 - Loading place
  'Parked in a loading place without loading': '25',

  // Code 26 - 50cm from kerb
  'Parked more than 50 cm from edge of carriageway': '26',

  // Code 27 - Dropped footway
  'Parked adjacent to a dropped footway': '27',

  // Code 28 - Raised carriageway
  'Parked on carriageway raised to meet footway': '28',

  // Code 30 - Parking longer than permitted
  'Parked for longer than permitted': '30',

  // Code 40 - Disabled bay
  'Parked in disabled bay without displaying badge': '40',
  'Not displaying disabled badge and parking disc': '40',

  // Code 45 - Taxi rank
  'Stopped on a taxi rank': '45',

  // Code 46 - Red route/clearway
  'Stopped where prohibited on red route or clearway': '46',

  // Code 47 - Bus stop
  'Stopped on a restricted bus stop or stand': '47',

  // Code 48 - School keep clear
  'Stopped in a restricted area outside a school etc': '48',

  // Code 49 - Cycle track
  'Parked wholly or partly on a cycle track': '49',
  'Being in a mandatory cycle lane': '49',

  // Code 61/62 - Footway parking
  'Footway parking': '62',
  'Footway parking  (one - four wheels on footway)': '62',
  'Heavy commercial vehicle footway parking': '61',

  // Code 99 - Pedestrian crossing
  'Stopped on a pedestrian crossing or zigzags': '99',

  // === PARKING CONTRAVENTIONS (Off-street/Car parks) ===

  // Code 81 - Restricted area in car park
  'Parked in a restricted area in a car park': '81',

  // Code 83 - Not within bay markings
  'Not parked correctly within markings of bay/space': '83',
  'Parked beyond the bay markings': '83',

  // Code 85 - Permit in car park
  'Parked in car park without clearly display': '85',
  'Parked without clearly displaying valid p&d ticket': '85',

  // Code 91 - Wrong vehicle class in car park
  'In car park or area not designated for vehicle': '91',

  // Code 92 - Obstruction
  'Parked causing an obstruction': '92',

  // === TfL MOVING TRAFFIC CONTRAVENTIONS ===

  // Box junction
  'Entering and stopping in a box junction': 'MT_BOX_JUNCTION',

  // Prohibited turn
  'Performing a prohibited turn': 'MT_PROHIBITED_TURN',

  // Bus lane
  'Being in a  bus lane': 'MT_BUS_LANE',
  'Being in a bus lane': 'MT_BUS_LANE',

  // Vehicle restriction
  'Fail comply prohibition on certain types vehicle': 'MT_VEHICLE_PROHIBITION',
  'Using a route restricted to certain vehicles': 'MT_RESTRICTED_ROUTE',

  // Pedestrian zone
  'Fail comply restriction vehicles entering ped zone': 'MT_PED_ZONE',
  'Fail comply restrict vehicles enter/wait ped zone': 'MT_PED_ZONE',

  // Direction signs
  'Fail proceed in direction shown by arrow blue sign': 'MT_DIRECTION',
  'Failing to comply with a keep left/right sign': 'MT_KEEP_LEFT_RIGHT',

  // No entry
  'Failing to comply with a no entry sign': 'MT_NO_ENTRY',

  // One way
  'Failing to comply with a one-way restriction': 'MT_ONE_WAY',

  // Give way
  'Failing to give way to oncoming vehicles': 'MT_GIVE_WAY',

  // HGV permit
  'No Valid HGV safety permit': 'MT_HGV_PERMIT',

  // === OTHER ===

  // Permit violations
  'Using a vehicle restricted street w/o valid permit': '16',
  'Using a vehicle in breach permit conditions': '16',

  // Commercial vehicle
  'Commercial veh parked in c/v of o/night wait ban': '55',

  // Re-parking
  'Re-parked within 1hour of leaving car park space': '82',

  // Diplomatic
  'Stopped in a parking place diplomatic vehicles': '41',

  // Purpose not designated
  'In a parking place for purpose not designated': '18',

  // Car park closed
  'Parked in a car park when closed': '80',
};

/**
 * Normalize an authority name to an issuer ID
 */
export function normalizeAuthority(authority: string | null | undefined): string | null {
  if (!authority) return null;
  const trimmed = authority.trim();
  return AUTHORITY_TO_ISSUER[trimmed] ?? null;
}

/**
 * Normalize a contravention description to a contravention code
 */
export function normalizeContravention(contravention: string | null | undefined): string | null {
  if (!contravention) return null;
  const trimmed = contravention.trim();

  // Direct lookup
  if (CONTRAVENTION_TO_CODE[trimmed]) {
    return CONTRAVENTION_TO_CODE[trimmed];
  }

  // Skip GBP amounts (malformed data)
  if (trimmed.startsWith('GBP ')) {
    return null;
  }

  // Skip dashes and N/A
  if (trimmed === '-' || trimmed === 'N/A') {
    return null;
  }

  // Skip CPZ references (malformed data)
  if (trimmed.includes('CPZ')) {
    return null;
  }

  return null;
}

/**
 * Get all known authorities
 */
export function getKnownAuthorities(): string[] {
  return Object.keys(AUTHORITY_TO_ISSUER);
}

/**
 * Get all known contraventions
 */
export function getKnownContraventions(): string[] {
  return Object.keys(CONTRAVENTION_TO_CODE);
}
