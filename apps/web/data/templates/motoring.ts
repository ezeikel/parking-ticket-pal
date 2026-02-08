import type { LetterTemplate } from './types';

export const motoringTemplates: LetterTemplate[] = [
  {
    id: 'sorn-declaration',
    title: 'SORN Declaration Letter',
    shortTitle: 'SORN Declaration',
    category: 'motoring',
    description:
      'Use this template to declare your vehicle off the road (Statutory Off Road Notification).',
    whenToUse: [
      'Your vehicle will be kept off public roads',
      'You want to avoid paying road tax',
      'The vehicle is being stored, repaired, or is not in use',
    ],
    tips: [
      'SORN can now be done online at gov.uk',
      'Your SORN lasts until you tax the vehicle or sell it',
      'The vehicle must be kept off public roads',
      'You\'ll still need insurance if it\'s parked on public land',
    ],
    placeholders: [
      {
        key: 'YOUR_NAME',
        label: 'Your Full Name',
        description: 'Your name as the registered keeper',
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
        key: 'VEHICLE_REG',
        label: 'Vehicle Registration',
        description: 'Your vehicle registration number',
        example: 'AB12 CDE',
        required: true,
        inputType: 'text',
      },
      {
        key: 'VEHICLE_MAKE_MODEL',
        label: 'Vehicle Make/Model',
        description: 'The make and model of your vehicle',
        example: 'Ford Focus',
        required: true,
        inputType: 'text',
      },
      {
        key: 'SORN_START_DATE',
        label: 'SORN Start Date',
        description: 'When you want the SORN to begin',
        example: '1 March 2026',
        required: true,
        inputType: 'date',
      },
      {
        key: 'STORAGE_LOCATION',
        label: 'Storage Location',
        description: 'Where the vehicle will be stored',
        example: 'Private driveway at my home address',
        required: true,
        inputType: 'text',
      },
    ],
    content: `[YOUR_NAME]
[YOUR_ADDRESS]

[DATE]

DVLA
Swansea
SA99 1AR

Dear Sir/Madam,

RE: Statutory Off Road Notification (SORN)
Vehicle Registration: [VEHICLE_REG]
Make/Model: [VEHICLE_MAKE_MODEL]

I am writing to make a Statutory Off Road Notification for the above vehicle.

I confirm that:
1. The vehicle will be kept off public roads from [SORN_START_DATE]
2. The vehicle will be stored at: [STORAGE_LOCATION]
3. I am the registered keeper of this vehicle
4. I understand the SORN will remain in place until I tax the vehicle or sell it

Please confirm receipt of this notification.

Yours faithfully,

[YOUR_NAME]

V11 Reference Number (if applicable): _______________`,
    legalDisclaimer:
      'This template is provided for informational purposes only. SORN can be done online at gov.uk which is usually faster and easier.',
  },
  {
    id: 'change-of-keeper',
    title: 'Change of Keeper Dispute Letter',
    shortTitle: 'Keeper Dispute',
    category: 'motoring',
    description:
      'Use this template to dispute liability for a vehicle you have sold or transferred.',
    whenToUse: [
      'You\'ve sold a vehicle but are still receiving fines',
      'The new keeper hasn\'t registered the vehicle in their name',
      'You need to prove you were not the keeper at the time',
    ],
    tips: [
      'Keep your V5C/2 slip as proof of sale',
      'Note the buyer\'s name and address',
      'Report the sale to DVLA online or by post',
      'Keep records of the sale (receipt, photos, messages)',
    ],
    placeholders: [
      {
        key: 'YOUR_NAME',
        label: 'Your Full Name',
        description: 'Your name as the former registered keeper',
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
        key: 'RECIPIENT_NAME',
        label: 'Recipient',
        description: 'Who you are writing to (council, DVLA, etc.)',
        example: 'Westminster City Council',
        required: true,
        inputType: 'text',
      },
      {
        key: 'RECIPIENT_ADDRESS',
        label: 'Recipient Address',
        description: 'Their postal address',
        example: 'Parking Services, PO Box 123, London, W1A 1AA',
        required: true,
        inputType: 'address',
      },
      {
        key: 'REFERENCE_NUMBER',
        label: 'Reference Number',
        description: 'The PCN or reference number',
        example: 'WM12345678',
        required: true,
        inputType: 'text',
      },
      {
        key: 'VEHICLE_REG',
        label: 'Vehicle Registration',
        description: 'The vehicle registration number',
        example: 'AB12 CDE',
        required: true,
        inputType: 'text',
      },
      {
        key: 'SALE_DATE',
        label: 'Date of Sale',
        description: 'When you sold or transferred the vehicle',
        example: '15 December 2025',
        required: true,
        inputType: 'date',
      },
      {
        key: 'BUYER_NAME',
        label: 'Buyer\'s Name',
        description: 'Name of the person you sold to',
        example: 'Jane Doe',
        required: true,
        inputType: 'text',
      },
      {
        key: 'BUYER_ADDRESS',
        label: 'Buyer\'s Address',
        description: 'Address of the person you sold to (if known)',
        example: '456 Oak Lane, London, E1 1AB',
        required: false,
        inputType: 'address',
      },
    ],
    content: `[YOUR_NAME]
[YOUR_ADDRESS]

[DATE]

[RECIPIENT_NAME]
[RECIPIENT_ADDRESS]

Dear Sir/Madam,

RE: Change of Keeper - Not Liable
Reference: [REFERENCE_NUMBER]
Vehicle Registration: [VEHICLE_REG]

I am writing to dispute my liability for the above matter.

I sold/transferred the above vehicle on [SALE_DATE] to:

Name: [BUYER_NAME]
Address: [BUYER_ADDRESS]

I was therefore not the registered keeper at the time of the alleged contravention and am not liable for any penalties.

I enclose copies of the following evidence:
- V5C/2 (new keeper supplement) showing date of sale
- [Any other evidence: receipt, messages, photos]

I notified DVLA of the sale on [date if applicable].

Please update your records and remove any penalties against me.

If you require the new keeper to pay, their details are provided above.

Yours faithfully,

[YOUR_NAME]`,
    legalDisclaimer:
      'This template is provided for informational purposes only. You should have notified DVLA of the sale using the V5C/2 slip.',
  },
  {
    id: 'insurance-dispute',
    title: 'Insurance Dispute Letter',
    shortTitle: 'Insurance Dispute',
    category: 'motoring',
    description:
      'Use this template to dispute a decision made by your car insurance company.',
    whenToUse: [
      'Your claim has been rejected',
      'You disagree with how fault has been assigned',
      'Your premium has increased unfairly',
      'You want to make a formal complaint',
    ],
    tips: [
      'Follow the insurer\'s complaints procedure first',
      'Refer to your policy documents',
      'You can escalate to the Financial Ombudsman Service',
      'Keep records of all correspondence',
    ],
    placeholders: [
      {
        key: 'YOUR_NAME',
        label: 'Your Full Name',
        description: 'Your name as it appears on the policy',
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
        key: 'INSURANCE_COMPANY',
        label: 'Insurance Company',
        description: 'Name of your insurance provider',
        example: 'ABC Insurance Ltd',
        required: true,
        inputType: 'text',
      },
      {
        key: 'INSURANCE_ADDRESS',
        label: 'Insurance Address',
        description: 'Their complaints department address',
        example: 'Customer Services, PO Box 123, Manchester, M1 1AA',
        required: true,
        inputType: 'address',
      },
      {
        key: 'POLICY_NUMBER',
        label: 'Policy Number',
        description: 'Your insurance policy number',
        example: 'POL123456789',
        required: true,
        inputType: 'text',
      },
      {
        key: 'CLAIM_NUMBER',
        label: 'Claim Number',
        description: 'Your claim reference number (if applicable)',
        example: 'CLM987654',
        required: false,
        inputType: 'text',
      },
      {
        key: 'DISPUTE_DETAILS',
        label: 'Dispute Details',
        description: 'What you are disputing and why',
        example: 'I am disputing the rejection of my claim because...',
        required: true,
        inputType: 'textarea',
      },
      {
        key: 'RESOLUTION_SOUGHT',
        label: 'Resolution Sought',
        description: 'What outcome you want',
        example: 'I request that my claim be reconsidered and paid in full...',
        required: true,
        inputType: 'textarea',
      },
    ],
    content: `[YOUR_NAME]
[YOUR_ADDRESS]

[DATE]

Complaints Department
[INSURANCE_COMPANY]
[INSURANCE_ADDRESS]

Dear Sir/Madam,

RE: Formal Complaint
Policy Number: [POLICY_NUMBER]
Claim Number: [CLAIM_NUMBER]

I am writing to make a formal complaint regarding the above matter.

DETAILS OF COMPLAINT

[DISPUTE_DETAILS]

RESOLUTION SOUGHT

[RESOLUTION_SOUGHT]

I have enclosed copies of relevant documentation to support my complaint.

Please acknowledge this complaint within 5 working days and provide a final response within 8 weeks as required by the Financial Conduct Authority.

If I am not satisfied with your response, I will refer this matter to the Financial Ombudsman Service.

Yours faithfully,

[YOUR_NAME]`,
    legalDisclaimer:
      'This template is provided for informational purposes only. Insurance complaints should follow your insurer\'s official complaints procedure.',
  },
  {
    id: 'dealer-complaint',
    title: 'Car Dealer Complaint Letter',
    shortTitle: 'Dealer Complaint',
    category: 'motoring',
    description:
      'Use this template to complain about a problem with a vehicle purchased from a dealer.',
    whenToUse: [
      'The vehicle has faults that weren\'t disclosed',
      'The car doesn\'t match its description',
      'You want to reject the vehicle or request repairs',
      'The dealer is refusing to honour consumer rights',
    ],
    tips: [
      'You have 30 days to reject a faulty vehicle for a full refund',
      'After 30 days you must give the dealer one chance to repair',
      'Keep all documentation and evidence of faults',
      'Consumer Rights Act 2015 protects your rights',
    ],
    placeholders: [
      {
        key: 'YOUR_NAME',
        label: 'Your Full Name',
        description: 'Your name as it appears on the purchase',
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
        key: 'DEALER_NAME',
        label: 'Dealer Name',
        description: 'Name of the dealership',
        example: 'XYZ Motors Ltd',
        required: true,
        inputType: 'text',
      },
      {
        key: 'DEALER_ADDRESS',
        label: 'Dealer Address',
        description: 'The dealership address',
        example: '789 Auto Way, London, N1 1AA',
        required: true,
        inputType: 'address',
      },
      {
        key: 'VEHICLE_REG',
        label: 'Vehicle Registration',
        description: 'The vehicle registration number',
        example: 'AB12 CDE',
        required: true,
        inputType: 'text',
      },
      {
        key: 'VEHICLE_DETAILS',
        label: 'Vehicle Details',
        description: 'Make, model, and year of the vehicle',
        example: '2023 Ford Focus 1.5 Titanium',
        required: true,
        inputType: 'text',
      },
      {
        key: 'PURCHASE_DATE',
        label: 'Purchase Date',
        description: 'When you bought the vehicle',
        example: '1 January 2026',
        required: true,
        inputType: 'date',
      },
      {
        key: 'PURCHASE_PRICE',
        label: 'Purchase Price',
        description: 'How much you paid',
        example: '15000',
        required: true,
        inputType: 'currency',
      },
      {
        key: 'PROBLEM_DETAILS',
        label: 'Problem Details',
        description: 'Description of the fault or issue',
        example: 'The engine warning light came on within a week of purchase...',
        required: true,
        inputType: 'textarea',
      },
      {
        key: 'REMEDY_SOUGHT',
        label: 'Remedy Sought',
        description: 'What you want the dealer to do',
        example: 'I am exercising my right to reject the vehicle and request a full refund...',
        required: true,
        inputType: 'textarea',
      },
    ],
    content: `[YOUR_NAME]
[YOUR_ADDRESS]

[DATE]

[DEALER_NAME]
[DEALER_ADDRESS]

Dear Sir/Madam,

RE: Complaint - Faulty Vehicle
Vehicle: [VEHICLE_DETAILS]
Registration: [VEHICLE_REG]
Date of Purchase: [PURCHASE_DATE]
Purchase Price: [PURCHASE_PRICE]

I am writing to make a formal complaint about the above vehicle which I purchased from you.

DETAILS OF PROBLEM

[PROBLEM_DETAILS]

CONSUMER RIGHTS

Under the Consumer Rights Act 2015, goods must be:
- Of satisfactory quality
- Fit for purpose
- As described

The faults described above mean the vehicle does not meet these requirements.

REMEDY SOUGHT

[REMEDY_SOUGHT]

Please respond within 14 days. If I do not receive a satisfactory response, I will:
- Report this matter to Trading Standards
- Consider alternative dispute resolution
- Take legal action if necessary

Yours faithfully,

[YOUR_NAME]`,
    legalDisclaimer:
      'This template is provided for informational purposes only. Your specific rights depend on when you bought the vehicle and the nature of the fault.',
  },
  {
    id: 'dvla-correction',
    title: 'DVLA Correction Letter',
    shortTitle: 'DVLA Correction',
    category: 'motoring',
    description:
      'Use this template to request a correction to your vehicle registration or driving licence records.',
    whenToUse: [
      'There\'s an error on your V5C (logbook)',
      'Your driving licence has incorrect details',
      'DVLA records don\'t match reality',
    ],
    tips: [
      'Many corrections can be made online at gov.uk',
      'Include your driving licence number or V5C reference',
      'Provide evidence of the correct information',
      'There may be a fee for issuing new documents',
    ],
    placeholders: [
      {
        key: 'YOUR_NAME',
        label: 'Your Full Name',
        description: 'Your full legal name',
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
        key: 'DOCUMENT_TYPE',
        label: 'Document Type',
        description: 'V5C, Driving Licence, or other',
        example: 'V5C Registration Certificate',
        required: true,
        inputType: 'text',
      },
      {
        key: 'REFERENCE_NUMBER',
        label: 'Reference Number',
        description: 'V5C document reference or driving licence number',
        example: 'V5C123456789 or SMITH123456AB1CD',
        required: true,
        inputType: 'text',
      },
      {
        key: 'CURRENT_ERROR',
        label: 'Current (Incorrect) Details',
        description: 'What is currently shown incorrectly',
        example: 'Name shown as "Jon Smith"',
        required: true,
        inputType: 'textarea',
      },
      {
        key: 'CORRECT_DETAILS',
        label: 'Correct Details',
        description: 'What it should say',
        example: 'Should be "John Smith"',
        required: true,
        inputType: 'textarea',
      },
      {
        key: 'EVIDENCE',
        label: 'Evidence Enclosed',
        description: 'What documents you are including as proof',
        example: 'Copy of passport, copy of birth certificate',
        required: true,
        inputType: 'textarea',
      },
    ],
    content: `[YOUR_NAME]
[YOUR_ADDRESS]

[DATE]

DVLA
Swansea
SA99 1AR

Dear Sir/Madam,

RE: Request for Correction
Document: [DOCUMENT_TYPE]
Reference: [REFERENCE_NUMBER]

I am writing to request a correction to my [DOCUMENT_TYPE].

CURRENT (INCORRECT) DETAILS

[CURRENT_ERROR]

CORRECT DETAILS

[CORRECT_DETAILS]

EVIDENCE

I enclose the following evidence to support this correction:
[EVIDENCE]

Please issue a corrected document and confirm when this has been done.

[If V5C: I enclose my current V5C with section 7 completed.]

[If driving licence: I enclose my current driving licence and a recent passport photo.]

Yours faithfully,

[YOUR_NAME]

Enclosures:
- Current document
- [List evidence enclosed]`,
    legalDisclaimer:
      'This template is provided for informational purposes only. Many DVLA services can be completed faster online at gov.uk.',
  },
];
