// Statutory grounds for PCN appeals under the Traffic Management Act 2004
// These are the legal grounds on which formal representations can be made

export type StatutoryGround = {
  id: string;
  label: string;
  description: string;
  shortLabel: string;
};

export const STATUTORY_GROUNDS: StatutoryGround[] = [
  {
    id: 'contravention-did-not-occur',
    label: 'The contravention did not occur',
    shortLabel: 'No contravention',
    description:
      'The alleged parking contravention did not happen as claimed by the enforcement authority.',
  },
  {
    id: 'not-owner-at-time',
    label: 'I was not the owner/keeper at the time',
    shortLabel: 'Not owner',
    description:
      'I was not the owner or registered keeper of the vehicle at the time of the alleged contravention.',
  },
  {
    id: 'vehicle-taken-without-consent',
    label: 'The vehicle was taken without consent',
    shortLabel: 'Vehicle taken',
    description:
      'The vehicle had been taken without my consent or that of the registered keeper.',
  },
  {
    id: 'hired-vehicle',
    label: 'The vehicle was a hire vehicle',
    shortLabel: 'Hire vehicle',
    description:
      'The vehicle was a hire vehicle and the hiring agreement and hirer details have been provided.',
  },
  {
    id: 'penalty-exceeded',
    label: 'The penalty exceeded the amount applicable',
    shortLabel: 'Penalty exceeded',
    description:
      'The amount of the penalty charge exceeds the amount applicable in the circumstances of the case.',
  },
  {
    id: 'not-enforcement-authority',
    label: 'The authority is not the enforcement authority',
    shortLabel: 'Wrong authority',
    description:
      'The enforcement authority was not the authority for the area where the contravention allegedly occurred.',
  },
  {
    id: 'procedural-impropriety',
    label: 'There was procedural impropriety',
    shortLabel: 'Procedural error',
    description:
      'There has been a procedural impropriety on the part of the enforcement authority.',
  },
  {
    id: 'invalid-tro',
    label: 'The Traffic Regulation Order was invalid',
    shortLabel: 'Invalid TRO',
    description:
      'The Traffic Regulation Order under which the PCN was issued is invalid or did not apply.',
  },
  {
    id: 'inadequate-signage',
    label: 'The signage was inadequate or unclear',
    shortLabel: 'Poor signage',
    description:
      'The traffic signs and road markings at the location were inadequate, unclear, or missing.',
  },
  {
    id: 'loading-unloading',
    label: 'I was loading or unloading',
    shortLabel: 'Loading/unloading',
    description:
      'The vehicle was engaged in loading or unloading at the time of the alleged contravention.',
  },
  {
    id: 'blue-badge-displayed',
    label: 'A valid Blue Badge was displayed',
    shortLabel: 'Blue Badge',
    description:
      'A valid disabled persons Blue Badge was correctly displayed at the time of the alleged contravention.',
  },
  {
    id: 'valid-permit-displayed',
    label: 'A valid permit was displayed',
    shortLabel: 'Valid permit',
    description:
      'A valid parking permit, voucher, or pay and display ticket was displayed at the time.',
  },
  {
    id: 'mechanical-breakdown',
    label: 'The vehicle had broken down',
    shortLabel: 'Breakdown',
    description:
      'The vehicle had broken down or suffered a mechanical fault that prevented it from being moved.',
  },
  {
    id: 'medical-emergency',
    label: 'There was a medical emergency',
    shortLabel: 'Medical emergency',
    description:
      'I was dealing with a medical emergency that required immediate attention.',
  },
];

export const getStatutoryGroundById = (id: string): StatutoryGround | undefined => {
  return STATUTORY_GROUNDS.find((ground) => ground.id === id);
};

export const formatStatutoryGrounds = (ids: string[]): string => {
  const grounds = ids
    .map((id) => getStatutoryGroundById(id))
    .filter((ground): ground is StatutoryGround => ground !== undefined);

  if (grounds.length === 0) return '';
  if (grounds.length === 1) return grounds[0].label;

  return grounds.map((ground) => `- ${ground.label}`).join('\n');
};
