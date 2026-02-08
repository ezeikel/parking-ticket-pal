import type { LetterTemplate } from './types';

export const parkingTemplates: LetterTemplate[] = [
  {
    id: 'informal-challenge',
    title: 'Informal Challenge Letter',
    shortTitle: 'Informal Challenge',
    category: 'parking',
    description:
      'Use this template to make an informal challenge to a Penalty Charge Notice (PCN) within the first 14 days.',
    whenToUse: [
      'You received a PCN in the last 14 days',
      'You want to challenge before the formal representation stage',
      'You have grounds to believe the PCN was issued incorrectly',
    ],
    tips: [
      'Submit within 14 days to preserve your 50% discount',
      'Be factual and avoid emotional language',
      'Include all relevant evidence (photos, receipts, etc.)',
      'Keep a copy of your letter and proof of postage',
    ],
    placeholders: [
      {
        key: 'YOUR_NAME',
        label: 'Your Full Name',
        description: 'Your name as it appears on official documents',
        example: 'John Smith',
        required: true,
        inputType: 'text',
      },
      {
        key: 'YOUR_ADDRESS',
        label: 'Your Address',
        description: 'Your full postal address including postcode',
        example: '123 High Street, London, SW1A 1AA',
        required: true,
        inputType: 'address',
      },
      {
        key: 'DATE',
        label: 'Today\'s Date',
        description: 'The date you are writing the letter',
        example: '4 February 2026',
        required: true,
        inputType: 'date',
      },
      {
        key: 'COUNCIL_NAME',
        label: 'Council/Authority Name',
        description: 'The name of the issuing authority',
        example: 'Westminster City Council',
        required: true,
        inputType: 'text',
      },
      {
        key: 'COUNCIL_ADDRESS',
        label: 'Council Address',
        description: 'The address for parking appeals',
        example: 'Parking Services, PO Box 123, London, W1A 1AA',
        required: true,
        inputType: 'address',
      },
      {
        key: 'PCN_NUMBER',
        label: 'PCN Number',
        description: 'The Penalty Charge Notice reference number',
        example: 'WM12345678',
        required: true,
        inputType: 'text',
      },
      {
        key: 'VEHICLE_REG',
        label: 'Vehicle Registration',
        description: 'Your vehicle registration number',
        example: 'AB12 CDE',
        required: true,
        inputType: 'text',
      },
      {
        key: 'CONTRAVENTION_DATE',
        label: 'Date of Alleged Contravention',
        description: 'The date shown on the PCN',
        example: '1 February 2026',
        required: true,
        inputType: 'date',
      },
      {
        key: 'CONTRAVENTION_LOCATION',
        label: 'Location',
        description: 'Where the alleged contravention occurred',
        example: 'Oxford Street, outside number 100',
        required: true,
        inputType: 'text',
      },
      {
        key: 'GROUNDS_FOR_CHALLENGE',
        label: 'Grounds for Challenge',
        description: 'Your reasons for challenging the PCN',
        example: 'The signage at the location was unclear/missing...',
        required: true,
        inputType: 'textarea',
      },
    ],
    content: `[YOUR_NAME]
[YOUR_ADDRESS]

[DATE]

[COUNCIL_NAME]
[COUNCIL_ADDRESS]

Dear Sir/Madam,

RE: Informal Challenge to Penalty Charge Notice
PCN Number: [PCN_NUMBER]
Vehicle Registration: [VEHICLE_REG]
Date of Alleged Contravention: [CONTRAVENTION_DATE]
Location: [CONTRAVENTION_LOCATION]

I am writing to make an informal challenge to the above Penalty Charge Notice, which I believe was issued incorrectly.

[GROUNDS_FOR_CHALLENGE]

In light of the above, I respectfully request that this PCN be cancelled. I have enclosed copies of any relevant evidence to support my challenge.

If you require any further information, please do not hesitate to contact me at the address above.

I look forward to your response within 14 days as required by legislation.

Yours faithfully,

[YOUR_NAME]`,
    legalDisclaimer:
      'This template is provided for informational purposes only and does not constitute legal advice. You should review and adapt this template to your specific circumstances.',
  },
  {
    id: 'formal-representation',
    title: 'Formal Representation Letter',
    shortTitle: 'Formal Representation',
    category: 'parking',
    description:
      'Use this template after receiving a Notice to Owner (NTO) to make formal representations against a PCN.',
    whenToUse: [
      'You have received a Notice to Owner',
      'Your informal challenge was rejected or you didn\'t make one',
      'You want to formally contest the PCN before it goes to tribunal',
    ],
    tips: [
      'You have 28 days from the date of the NTO to respond',
      'Reference your previous correspondence if applicable',
      'Clearly state which statutory ground(s) your appeal is based on',
      'This is your last chance before the council makes a final decision',
    ],
    placeholders: [
      {
        key: 'YOUR_NAME',
        label: 'Your Full Name',
        description: 'Your name as it appears on official documents',
        example: 'John Smith',
        required: true,
        inputType: 'text',
      },
      {
        key: 'YOUR_ADDRESS',
        label: 'Your Address',
        description: 'Your full postal address including postcode',
        example: '123 High Street, London, SW1A 1AA',
        required: true,
        inputType: 'address',
      },
      {
        key: 'DATE',
        label: 'Today\'s Date',
        description: 'The date you are writing the letter',
        example: '4 February 2026',
        required: true,
        inputType: 'date',
      },
      {
        key: 'COUNCIL_NAME',
        label: 'Council/Authority Name',
        description: 'The name of the issuing authority',
        example: 'Westminster City Council',
        required: true,
        inputType: 'text',
      },
      {
        key: 'COUNCIL_ADDRESS',
        label: 'Council Address',
        description: 'The address for parking appeals',
        example: 'Parking Services, PO Box 123, London, W1A 1AA',
        required: true,
        inputType: 'address',
      },
      {
        key: 'PCN_NUMBER',
        label: 'PCN Number',
        description: 'The Penalty Charge Notice reference number',
        example: 'WM12345678',
        required: true,
        inputType: 'text',
      },
      {
        key: 'NTO_DATE',
        label: 'Notice to Owner Date',
        description: 'The date on your Notice to Owner',
        example: '20 January 2026',
        required: true,
        inputType: 'date',
      },
      {
        key: 'VEHICLE_REG',
        label: 'Vehicle Registration',
        description: 'Your vehicle registration number',
        example: 'AB12 CDE',
        required: true,
        inputType: 'text',
      },
      {
        key: 'STATUTORY_GROUNDS',
        label: 'Statutory Grounds',
        description: 'The legal grounds for your appeal',
        example: 'The contravention did not occur / The penalty exceeded the relevant amount...',
        required: true,
        inputType: 'statutory-grounds',
      },
      {
        key: 'DETAILED_REASONS',
        label: 'Detailed Reasons',
        description: 'Full explanation of why the PCN should be cancelled',
        example: 'On the date in question, I was...',
        required: true,
        inputType: 'textarea',
      },
    ],
    content: `[YOUR_NAME]
[YOUR_ADDRESS]

[DATE]

[COUNCIL_NAME]
[COUNCIL_ADDRESS]

Dear Sir/Madam,

RE: Formal Representations Against Penalty Charge Notice
PCN Number: [PCN_NUMBER]
Notice to Owner Dated: [NTO_DATE]
Vehicle Registration: [VEHICLE_REG]

I am writing to make formal representations against the above Penalty Charge Notice pursuant to the Traffic Management Act 2004.

STATUTORY GROUNDS

I am making these representations on the following statutory ground(s):

[STATUTORY_GROUNDS]

DETAILED REASONS

[DETAILED_REASONS]

CONCLUSION

Based on the above, I respectfully submit that this PCN should be cancelled. I have enclosed copies of all relevant evidence to support my representations.

If you reject these representations, I request that you provide full reasons for your decision and information about how to appeal to the Traffic Penalty Tribunal.

Yours faithfully,

[YOUR_NAME]`,
    legalDisclaimer:
      'This template is provided for informational purposes only and does not constitute legal advice. You should review and adapt this template to your specific circumstances.',
  },
  {
    id: 'tribunal-appeal',
    title: 'Tribunal Appeal Letter',
    shortTitle: 'Tribunal Appeal',
    category: 'parking',
    description:
      'Use this template to appeal to the Traffic Penalty Tribunal after your formal representations have been rejected.',
    whenToUse: [
      'Your formal representations were rejected',
      'You received a Notice of Rejection',
      'You want to appeal to an independent adjudicator',
    ],
    tips: [
      'You have 28 days from the Notice of Rejection to appeal',
      'You can appeal online at tribunals.gov.uk',
      'An independent adjudicator will review your case',
      'The tribunal decision is final and binding on the council',
    ],
    placeholders: [
      {
        key: 'YOUR_NAME',
        label: 'Your Full Name',
        description: 'Your name as it appears on official documents',
        example: 'John Smith',
        required: true,
        inputType: 'text',
      },
      {
        key: 'YOUR_ADDRESS',
        label: 'Your Address',
        description: 'Your full postal address including postcode',
        example: '123 High Street, London, SW1A 1AA',
        required: true,
        inputType: 'address',
      },
      {
        key: 'YOUR_EMAIL',
        label: 'Your Email',
        description: 'Your email address for correspondence',
        example: 'john.smith@email.com',
        required: true,
        inputType: 'text',
      },
      {
        key: 'YOUR_PHONE',
        label: 'Your Phone Number',
        description: 'Your contact telephone number',
        example: '07123 456789',
        required: true,
        inputType: 'text',
      },
      {
        key: 'PCN_NUMBER',
        label: 'PCN Number',
        description: 'The Penalty Charge Notice reference number',
        example: 'WM12345678',
        required: true,
        inputType: 'text',
      },
      {
        key: 'COUNCIL_NAME',
        label: 'Council/Authority Name',
        description: 'The name of the issuing authority',
        example: 'Westminster City Council',
        required: true,
        inputType: 'text',
      },
      {
        key: 'VEHICLE_REG',
        label: 'Vehicle Registration',
        description: 'Your vehicle registration number',
        example: 'AB12 CDE',
        required: true,
        inputType: 'text',
      },
      {
        key: 'CONTRAVENTION_DATE',
        label: 'Date of Alleged Contravention',
        description: 'The date shown on the PCN',
        example: '1 February 2026',
        required: true,
        inputType: 'date',
      },
      {
        key: 'CONTRAVENTION_LOCATION',
        label: 'Location',
        description: 'Where the alleged contravention occurred',
        example: 'Oxford Street, outside number 100',
        required: true,
        inputType: 'text',
      },
      {
        key: 'GROUNDS_FOR_APPEAL',
        label: 'Grounds for Appeal',
        description: 'Your detailed reasons for appealing',
        example: 'I believe the PCN should be cancelled because...',
        required: true,
        inputType: 'textarea',
      },
    ],
    content: `NOTICE OF APPEAL TO THE TRAFFIC PENALTY TRIBUNAL

Appellant Details:
Name: [YOUR_NAME]
Address: [YOUR_ADDRESS]
Email: [YOUR_EMAIL]
Telephone: [YOUR_PHONE]

PCN Details:
PCN Number: [PCN_NUMBER]
Issuing Authority: [COUNCIL_NAME]
Vehicle Registration: [VEHICLE_REG]
Date of Contravention: [CONTRAVENTION_DATE]
Location: [CONTRAVENTION_LOCATION]

GROUNDS FOR APPEAL

I am appealing against the above Penalty Charge Notice for the following reasons:

[GROUNDS_FOR_APPEAL]

EVIDENCE

I have attached the following evidence in support of my appeal:
1. Copy of the PCN
2. Copy of the Notice of Rejection
3. [List any additional evidence]

DECLARATION

I confirm that the information provided in this appeal is true and accurate to the best of my knowledge.

Signed: [YOUR_NAME]
Date: [DATE]`,
    legalDisclaimer:
      'This template is provided for informational purposes only and does not constitute legal advice. Appeals to the Traffic Penalty Tribunal can now be made online at tribunals.gov.uk.',
  },
  {
    id: 'witness-statement',
    title: 'Witness Statement Template',
    shortTitle: 'Witness Statement',
    category: 'parking',
    description:
      'Use this template to provide a witness statement supporting your parking appeal.',
    whenToUse: [
      'Someone else can corroborate your account',
      'A passenger was with you at the time',
      'A shop owner or other witness can support your case',
    ],
    tips: [
      'Witnesses should only state facts they personally observed',
      'The statement must be signed and dated',
      'Include the witness\'s contact details',
      'Witnesses may be contacted by the council or tribunal',
    ],
    placeholders: [
      {
        key: 'WITNESS_NAME',
        label: 'Witness Full Name',
        description: 'The witness\'s full legal name',
        example: 'Jane Doe',
        required: true,
        inputType: 'text',
      },
      {
        key: 'WITNESS_ADDRESS',
        label: 'Witness Address',
        description: 'The witness\'s full postal address',
        example: '456 Oak Lane, London, E1 1AB',
        required: true,
        inputType: 'address',
      },
      {
        key: 'DATE',
        label: 'Statement Date',
        description: 'The date the statement is being made',
        example: '4 February 2026',
        required: true,
        inputType: 'date',
      },
      {
        key: 'PCN_NUMBER',
        label: 'PCN Number',
        description: 'The PCN reference number',
        example: 'WM12345678',
        required: true,
        inputType: 'text',
      },
      {
        key: 'APPELLANT_NAME',
        label: 'Appellant Name',
        description: 'The name of the person appealing',
        example: 'John Smith',
        required: true,
        inputType: 'text',
      },
      {
        key: 'INCIDENT_DATE',
        label: 'Date of Incident',
        description: 'When the alleged contravention occurred',
        example: '1 February 2026',
        required: true,
        inputType: 'date',
      },
      {
        key: 'STATEMENT_CONTENT',
        label: 'Statement',
        description: 'The witness\'s account of events',
        example: 'On the date in question, I was present when...',
        required: true,
        inputType: 'textarea',
      },
    ],
    content: `WITNESS STATEMENT

I, [WITNESS_NAME], of [WITNESS_ADDRESS], make this statement in support of [APPELLANT_NAME]'s appeal against PCN [PCN_NUMBER].

Date of Incident: [INCIDENT_DATE]

STATEMENT

[STATEMENT_CONTENT]

I confirm that:
1. This statement is true to the best of my knowledge and belief
2. I understand that this statement may be used in tribunal proceedings
3. I am willing to be contacted to verify this statement if required

Signed: ________________________

Name: [WITNESS_NAME]

Date: [DATE]`,
    legalDisclaimer:
      'This template is provided for informational purposes only. Providing false information in a witness statement may have legal consequences.',
  },
  {
    id: 'mitigation-hardship',
    title: 'Mitigation/Hardship Letter',
    shortTitle: 'Hardship Letter',
    category: 'parking',
    description:
      'Use this template to request special consideration due to exceptional circumstances or financial hardship.',
    whenToUse: [
      'You cannot dispute the contravention but have mitigating circumstances',
      'You are experiencing financial hardship',
      'There were exceptional circumstances beyond your control',
    ],
    tips: [
      'This does not guarantee the PCN will be cancelled',
      'Councils have discretion but are not obligated to waive fines',
      'Be honest about your circumstances',
      'Provide supporting evidence where possible',
    ],
    placeholders: [
      {
        key: 'YOUR_NAME',
        label: 'Your Full Name',
        description: 'Your name as it appears on official documents',
        example: 'John Smith',
        required: true,
        inputType: 'text',
      },
      {
        key: 'YOUR_ADDRESS',
        label: 'Your Address',
        description: 'Your full postal address including postcode',
        example: '123 High Street, London, SW1A 1AA',
        required: true,
        inputType: 'address',
      },
      {
        key: 'DATE',
        label: 'Today\'s Date',
        description: 'The date you are writing the letter',
        example: '4 February 2026',
        required: true,
        inputType: 'date',
      },
      {
        key: 'COUNCIL_NAME',
        label: 'Council/Authority Name',
        description: 'The name of the issuing authority',
        example: 'Westminster City Council',
        required: true,
        inputType: 'text',
      },
      {
        key: 'COUNCIL_ADDRESS',
        label: 'Council Address',
        description: 'The address for parking appeals',
        example: 'Parking Services, PO Box 123, London, W1A 1AA',
        required: true,
        inputType: 'address',
      },
      {
        key: 'PCN_NUMBER',
        label: 'PCN Number',
        description: 'The Penalty Charge Notice reference number',
        example: 'WM12345678',
        required: true,
        inputType: 'text',
      },
      {
        key: 'VEHICLE_REG',
        label: 'Vehicle Registration',
        description: 'Your vehicle registration number',
        example: 'AB12 CDE',
        required: true,
        inputType: 'text',
      },
      {
        key: 'MITIGATING_CIRCUMSTANCES',
        label: 'Mitigating Circumstances',
        description: 'Explain your exceptional circumstances',
        example: 'At the time of the alleged contravention, I was dealing with a medical emergency...',
        required: true,
        inputType: 'textarea',
      },
    ],
    content: `[YOUR_NAME]
[YOUR_ADDRESS]

[DATE]

[COUNCIL_NAME]
[COUNCIL_ADDRESS]

Dear Sir/Madam,

RE: Request for Mitigation - PCN [PCN_NUMBER]
Vehicle Registration: [VEHICLE_REG]

I am writing to request that you consider the mitigating circumstances surrounding the above Penalty Charge Notice.

While I understand that a contravention may have technically occurred, I respectfully ask that you consider the following exceptional circumstances:

[MITIGATING_CIRCUMSTANCES]

I understand that you are not obligated to cancel the PCN on compassionate grounds, but I respectfully request that you exercise your discretion in light of these circumstances.

If you are unable to cancel the PCN, I would be grateful if you could consider:
- Extending the deadline for payment
- Allowing payment by instalments
- Any other reasonable accommodation

I have enclosed supporting documentation where available.

Thank you for your consideration.

Yours faithfully,

[YOUR_NAME]`,
    legalDisclaimer:
      'This template is provided for informational purposes only. Mitigation requests are at the discretion of the issuing authority and are not guaranteed to succeed.',
  },
];
