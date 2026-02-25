type IssuerType = 'council' | 'private' | 'tfl';

type FaqItem = {
  question: string;
  answer: string;
};

type CommonCode = {
  code: string;
  description: string;
};

type PenaltyInfo = {
  higherLevel: string;
  lowerLevel: string;
  discountPeriod: string;
  discountNote: string;
};

type AppealStep = {
  name: string;
  deadline: string;
  description: string;
};

type IssuerEducationalContent = {
  commonCodes: CommonCode[];
  penaltyInfo: PenaltyInfo;
  faqItems: FaqItem[];
  appealProcess: AppealStep[];
};

const councilContent: IssuerEducationalContent = {
  commonCodes: [
    {
      code: '01',
      description: 'Parked in a restricted street during prescribed hours',
    },
    {
      code: '12',
      description: "Parked in residents' bay without a valid permit",
    },
    { code: '05', description: 'Parked after the expiry of paid for time' },
    { code: '30', description: 'Parked for longer than permitted' },
    {
      code: '40',
      description: 'Parked in a disabled bay without a valid badge',
    },
    { code: '47', description: 'Stopped on a restricted bus stop or stand' },
  ],
  penaltyInfo: {
    higherLevel: '£130 (London) / £70 (outside London)',
    lowerLevel: '£80 (London) / £50 (outside London)',
    discountPeriod: '14 days',
    discountNote:
      'Pay 50% of the full amount if you pay within 14 days of the PCN being served. The discount period is paused if you make an informal challenge.',
  },
  faqItems: [
    {
      question: 'What is the time limit to appeal a council parking ticket?',
      answer:
        'You have 14 days for an informal challenge (which preserves your 50% early payment discount), 28 days from the Notice to Owner (NTO) for a formal representation, and 28 days from the Notice of Rejection to appeal to the independent tribunal. There is no legal time limit for the informal challenge, but acting within 14 days is strongly recommended.',
    },
    {
      question: 'Can I still get the 50% discount if I appeal a council PCN?',
      answer:
        'Yes. If you make an informal challenge within 14 days, the discount period is paused. If your challenge is rejected, you will be given a further 14 days to pay at the discounted rate. The discount is only lost if you do not challenge and do not pay within the initial 14-day window.',
    },
    {
      question: 'What happens if the council rejects my appeal?',
      answer:
        'If your informal challenge is rejected, the council must issue a Notice to Owner (NTO). You then have 28 days to make a formal representation citing one of the statutory grounds. If that is rejected, you can appeal to the independent tribunal (London Tribunals or Traffic Penalty Tribunal) within 28 days — this is free and binding on the council.',
    },
    {
      question:
        'What evidence should I include when appealing a council parking ticket?',
      answer:
        'Include photographs of the parking location (signs, road markings, your vehicle), your parking payment receipt or permit, a map showing the area, and any mitigating evidence. Reference specific facts — unclear signage, faulty meters, or procedural errors on the PCN itself (wrong date, time, vehicle registration, or location).',
    },
  ],
  appealProcess: [
    {
      name: 'Informal Challenge',
      deadline: 'Within 14 days (recommended)',
      description:
        'Write to the council explaining why the PCN should be cancelled. Include evidence. The 50% discount period pauses while this is considered.',
    },
    {
      name: 'Notice to Owner (NTO)',
      deadline:
        'Issued by council after 28 days or rejection of informal challenge',
      description:
        'The council sends an NTO if the PCN remains unpaid. This starts the formal process.',
    },
    {
      name: 'Formal Representation',
      deadline: 'Within 28 days of NTO',
      description:
        'Submit a formal representation on one of the statutory grounds listed in the NTO. The council must consider it and respond.',
    },
    {
      name: 'Tribunal Appeal',
      deadline: 'Within 28 days of Notice of Rejection',
      description:
        "Appeal to the independent tribunal. This is free, and the tribunal's decision is binding on the council. You do not need to pay while an appeal is pending.",
    },
  ],
};

const privateContent: IssuerEducationalContent = {
  commonCodes: [
    { code: '82', description: 'Parked after the expiry of paid for time' },
    {
      code: '83',
      description:
        'Parked without clearly displaying a valid pay & display ticket',
    },
    { code: '85', description: 'Parked without displaying a valid permit' },
    { code: '73', description: 'Parked without payment of the parking charge' },
    {
      code: '86',
      description: 'Not parked correctly within the markings of a bay',
    },
    { code: '80', description: 'Parked for longer than permitted' },
  ],
  penaltyInfo: {
    higherLevel: 'Up to £100 (BPA cap)',
    lowerLevel: '£60-£80 (typical)',
    discountPeriod: '14 days',
    discountNote:
      'Most private operators offer a reduced rate if paid within 14 days. The amount varies by company. Check your notice for the specific reduced amount.',
  },
  faqItems: [
    {
      question: 'Are private parking tickets legally enforceable?',
      answer:
        'Private parking charges are not the same as council PCNs. They are invoices for breach of contract (between the driver/keeper and the landowner). Since the Protection of Freedoms Act 2012, parking companies can pursue the registered keeper if the driver cannot be identified. They can take you to county court, but they cannot clamp your vehicle, add statutory surcharges, or send bailiffs.',
    },
    {
      question: 'Should I ignore a private parking ticket?',
      answer:
        'It depends on the circumstances. If the charge is fair and you did breach the terms, paying within the discount period is usually the cheapest option. If you have grounds to appeal, do so — the company cannot add charges while an appeal is in progress. Simply ignoring it may lead to debt collection letters and, eventually, a county court claim.',
    },
    {
      question: 'What is POPLA and how does it work?',
      answer:
        'POPLA (Parking on Private Land Appeals) is the independent appeals service for tickets issued by BPA (British Parking Association) member companies. IAS (Independent Appeals Service) handles appeals for IPC (International Parking Community) members. Both are free to use. If the company rejects your initial appeal, you have 28 days to escalate to the relevant independent adjudicator.',
    },
    {
      question: 'What are good grounds for appealing a private parking charge?',
      answer:
        'Common grounds include: inadequate or misleading signage, the charge being disproportionate to any actual loss, no valid contract with the driver, the Notice to Keeper not being sent within 14 days of the event (for keeper liability), broken payment machines, and any grace periods not being observed.',
    },
  ],
  appealProcess: [
    {
      name: 'Initial Appeal to Operator',
      deadline: 'Within 28 days of the notice',
      description:
        'Contact the parking company directly using the appeals process on the notice. State your grounds clearly and include evidence.',
    },
    {
      name: 'Independent Appeal (POPLA/IAS)',
      deadline: 'Within 28 days of rejection',
      description:
        'If your initial appeal is rejected, escalate to POPLA (for BPA members) or IAS (for IPC members). This is free and the decision is binding on the operator.',
    },
  ],
};

const tflContent: IssuerEducationalContent = {
  commonCodes: [
    {
      code: '46',
      description: 'Stopped where prohibited (on a red route or clearway)',
    },
    { code: '47', description: 'Stopped on a restricted bus stop or stand' },
    { code: '34', description: 'Being in a bus lane' },
    {
      code: '48',
      description: 'Stopped in a restricted area outside a school',
    },
    {
      code: '99',
      description: 'Stopped on a pedestrian crossing or crossing area',
    },
    { code: '31', description: 'Entering and stopping in a box junction' },
  ],
  penaltyInfo: {
    higherLevel: '£160',
    lowerLevel: '£130',
    discountPeriod: '14 days',
    discountNote:
      'TfL PCNs are set at London rates. Pay 50% if paid within 14 days. Bus lane and congestion charge penalties have separate amounts.',
  },
  faqItems: [
    {
      question: 'How do I appeal a TfL bus lane PCN?',
      answer:
        'TfL bus lane PCNs are enforced by CCTV. You can make an informal challenge online at tfl.gov.uk within 14 days. If rejected, wait for the Notice to Owner and make a formal representation within 28 days. If that is rejected, appeal to London Tribunals within 28 days. Common grounds include unclear lane markings, signage obstructed by foliage, or being directed into the lane by another road user or emergency.',
    },
    {
      question: 'Can I appeal a TfL congestion charge penalty?',
      answer:
        "Yes. If you forgot to pay the Congestion Charge, you'll receive a PCN from TfL. You can pay the charge plus a reduced penalty within 14 days. To appeal, use TfL's online system. Grounds include: you were exempt (e.g. disabled badge holder), the vehicle was stolen, or the penalty was issued in error.",
    },
    {
      question: 'What roads does TfL enforce parking on?',
      answer:
        'TfL is responsible for the Transport for London Road Network (TLRN) — major red routes across London including the A2, A3, A4, A10, A12, A13, A40, A41, A316, A406 (North Circular), and A205 (South Circular). Local boroughs enforce parking on all other roads within their boundaries.',
    },
  ],
  appealProcess: [
    {
      name: 'Informal Challenge',
      deadline: 'Within 14 days (recommended)',
      description:
        'Challenge online at tfl.gov.uk. The 50% discount period pauses while TfL considers your challenge.',
    },
    {
      name: 'Notice to Owner (NTO)',
      deadline:
        'Issued by TfL after 28 days or rejection of informal challenge',
      description:
        'TfL sends an NTO if the PCN remains unpaid. This starts the formal process.',
    },
    {
      name: 'Formal Representation',
      deadline: 'Within 28 days of NTO',
      description:
        'Submit a formal representation on statutory grounds. TfL must consider and respond.',
    },
    {
      name: 'London Tribunals Appeal',
      deadline: 'Within 28 days of Notice of Rejection',
      description:
        'Appeal to London Tribunals (formerly PATAS). This is free and the decision is binding on TfL.',
    },
  ],
};

const EDUCATIONAL_CONTENT: Record<IssuerType, IssuerEducationalContent> = {
  council: councilContent,
  private: privateContent,
  tfl: tflContent,
};

export function getEducationalContentForIssuerType(
  type: IssuerType,
): IssuerEducationalContent {
  return EDUCATIONAL_CONTENT[type];
}

export type {
  IssuerEducationalContent,
  FaqItem,
  CommonCode,
  PenaltyInfo,
  AppealStep,
};
