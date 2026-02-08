import type { LetterTemplate } from './types';

export const bailiffTemplates: LetterTemplate[] = [
  {
    id: 'dispute-bailiff-fees',
    title: 'Dispute Bailiff Fees Letter',
    shortTitle: 'Dispute Fees',
    category: 'bailiff',
    description:
      'Use this template to challenge excessive or incorrectly applied bailiff fees.',
    whenToUse: [
      'Bailiff fees seem higher than they should be',
      'You believe fees have been incorrectly calculated',
      'You want to request a breakdown of charges',
    ],
    tips: [
      'Bailiff fees are set by law - check the current limits',
      'Request an itemised breakdown of all charges',
      'Keep records of all contact with the bailiff company',
      'You can complain to the creditor if fees are excessive',
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
        key: 'BAILIFF_COMPANY',
        label: 'Bailiff Company Name',
        description: 'The name of the enforcement company',
        example: 'XYZ Enforcement Ltd',
        required: true,
        inputType: 'text',
      },
      {
        key: 'BAILIFF_ADDRESS',
        label: 'Bailiff Company Address',
        description: 'Their postal address',
        example: 'Enforcement House, Business Park, London, EC1A 1AA',
        required: true,
        inputType: 'address',
      },
      {
        key: 'REFERENCE_NUMBER',
        label: 'Reference Number',
        description: 'Your case or debt reference number',
        example: 'ENF123456',
        required: true,
        inputType: 'text',
      },
      {
        key: 'ORIGINAL_DEBT',
        label: 'Original Debt Amount',
        description: 'The amount of the original debt',
        example: '130.00',
        required: true,
        inputType: 'currency',
      },
      {
        key: 'TOTAL_CLAIMED',
        label: 'Total Amount Claimed',
        description: 'The total they are now claiming',
        example: '500.00',
        required: true,
        inputType: 'currency',
      },
      {
        key: 'SPECIFIC_CONCERNS',
        label: 'Specific Concerns',
        description: 'Details of which fees you are disputing',
        example: 'I believe the enforcement stage fee has been applied incorrectly as...',
        required: true,
        inputType: 'textarea',
      },
    ],
    content: `[YOUR_NAME]
[YOUR_ADDRESS]

[DATE]

[BAILIFF_COMPANY]
[BAILIFF_ADDRESS]

Dear Sir/Madam,

RE: Dispute of Enforcement Fees
Reference Number: [REFERENCE_NUMBER]

I am writing to formally dispute the enforcement fees that have been added to my account.

The original debt amount was [ORIGINAL_DEBT], however I am now being asked to pay [TOTAL_CLAIMED].

I am disputing the fees for the following reasons:

[SPECIFIC_CONCERNS]

Please provide me with:
1. A full itemised breakdown of all fees applied
2. Evidence that each enforcement stage was properly completed
3. Dates and times of any visits to my property
4. Documentation showing how each fee was calculated

I am aware that enforcement fees are regulated by the Taking Control of Goods (Fees) Regulations 2014 and must be reasonable and proportionate.

If you are unable to justify these fees, I request that they be reduced accordingly.

Please respond within 14 days with the information requested.

Yours faithfully,

[YOUR_NAME]`,
    legalDisclaimer:
      'This template is provided for informational purposes only. Bailiff fee limits are set by law and change periodically. Check current limits before disputing.',
  },
  {
    id: 'request-evidence',
    title: 'Request Evidence Letter',
    shortTitle: 'Request Evidence',
    category: 'bailiff',
    description:
      'Use this template to request proof that the original debt is valid and enforceable.',
    whenToUse: [
      'You don\'t recognise the debt',
      'You want to verify the debt is legitimate',
      'You need to check the paperwork is in order',
    ],
    tips: [
      'Bailiffs must prove the debt is valid if challenged',
      'Request copies of the original PCN and any correspondence',
      'Check that proper procedures were followed',
      'Don\'t ignore bailiff letters even if you dispute the debt',
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
        key: 'BAILIFF_COMPANY',
        label: 'Bailiff Company Name',
        description: 'The name of the enforcement company',
        example: 'XYZ Enforcement Ltd',
        required: true,
        inputType: 'text',
      },
      {
        key: 'BAILIFF_ADDRESS',
        label: 'Bailiff Company Address',
        description: 'Their postal address',
        example: 'Enforcement House, Business Park, London, EC1A 1AA',
        required: true,
        inputType: 'address',
      },
      {
        key: 'REFERENCE_NUMBER',
        label: 'Reference Number',
        description: 'Your case or debt reference number',
        example: 'ENF123456',
        required: true,
        inputType: 'text',
      },
      {
        key: 'REASON_FOR_REQUEST',
        label: 'Reason for Request',
        description: 'Why you are requesting this evidence',
        example: 'I have no record of receiving the original PCN...',
        required: true,
        inputType: 'textarea',
      },
    ],
    content: `[YOUR_NAME]
[YOUR_ADDRESS]

[DATE]

[BAILIFF_COMPANY]
[BAILIFF_ADDRESS]

Dear Sir/Madam,

RE: Request for Evidence of Debt Validity
Reference Number: [REFERENCE_NUMBER]

I am writing to request evidence that the debt you are seeking to enforce is valid and that proper procedures have been followed.

[REASON_FOR_REQUEST]

Please provide me with copies of the following:

1. The original Penalty Charge Notice
2. Proof of service of the PCN (if fixed to vehicle, photo evidence)
3. The Notice to Owner and proof of service
4. Any representations made and the council's response
5. The Charge Certificate
6. The court order (Traffic Enforcement Centre registration)
7. The warrant authorising enforcement

I am entitled to this information under the Data Protection Act 2018 and common law principles of natural justice.

Until I receive satisfactory evidence that this debt is valid and enforceable, I do not accept liability and request that all enforcement action is suspended.

Please respond within 14 days.

Yours faithfully,

[YOUR_NAME]`,
    legalDisclaimer:
      'This template is provided for informational purposes only. If you have a valid debt, you should still work towards resolving it.',
  },
  {
    id: 'payment-plan-request',
    title: 'Payment Plan Request',
    shortTitle: 'Payment Plan',
    category: 'bailiff',
    description:
      'Use this template to request a payment plan to pay the debt in instalments.',
    whenToUse: [
      'You cannot afford to pay the full amount immediately',
      'You want to avoid further enforcement action',
      'You acknowledge the debt but need time to pay',
    ],
    tips: [
      'Be realistic about what you can afford',
      'Provide a brief explanation of your circumstances',
      'Bailiffs are not obligated to accept payment plans',
      'Making an offer shows good faith',
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
        key: 'BAILIFF_COMPANY',
        label: 'Bailiff Company Name',
        description: 'The name of the enforcement company',
        example: 'XYZ Enforcement Ltd',
        required: true,
        inputType: 'text',
      },
      {
        key: 'BAILIFF_ADDRESS',
        label: 'Bailiff Company Address',
        description: 'Their postal address',
        example: 'Enforcement House, Business Park, London, EC1A 1AA',
        required: true,
        inputType: 'address',
      },
      {
        key: 'REFERENCE_NUMBER',
        label: 'Reference Number',
        description: 'Your case or debt reference number',
        example: 'ENF123456',
        required: true,
        inputType: 'text',
      },
      {
        key: 'TOTAL_DEBT',
        label: 'Total Debt Amount',
        description: 'The total amount being claimed',
        example: '450.00',
        required: true,
        inputType: 'currency',
      },
      {
        key: 'MONTHLY_OFFER',
        label: 'Monthly Payment Offer',
        description: 'How much you can afford per month',
        example: '50.00',
        required: true,
        inputType: 'currency',
      },
      {
        key: 'CIRCUMSTANCES',
        label: 'Your Circumstances',
        description: 'Brief explanation of why you need a payment plan',
        example: 'I am currently on a limited income and have other essential outgoings...',
        required: true,
        inputType: 'textarea',
      },
    ],
    content: `[YOUR_NAME]
[YOUR_ADDRESS]

[DATE]

[BAILIFF_COMPANY]
[BAILIFF_ADDRESS]

Dear Sir/Madam,

RE: Request for Payment Plan
Reference Number: [REFERENCE_NUMBER]
Total Amount Due: [TOTAL_DEBT]

I am writing to request a payment plan to settle the above debt.

I acknowledge that I owe this amount and I want to pay it, however I am currently unable to pay the full amount immediately due to the following circumstances:

[CIRCUMSTANCES]

I am therefore proposing to pay [MONTHLY_OFFER] per month until the debt is cleared in full.

I propose that:
- The first payment of [MONTHLY_OFFER] will be made on [DATE + 14 days]
- Subsequent payments will be made on the same date each month
- I will set up a standing order to ensure payments are made on time

In exchange for this arrangement, I request that:
- All enforcement action is suspended
- No further fees are added while payments are being made
- The arrangement is confirmed in writing

Please confirm whether this arrangement is acceptable. I am committed to clearing this debt and hope we can reach an agreement.

Yours faithfully,

[YOUR_NAME]`,
    legalDisclaimer:
      'This template is provided for informational purposes only. Bailiffs are not obligated to accept payment plans, but many will if you engage constructively.',
  },
  {
    id: 'complaint-letter',
    title: 'Bailiff Complaint Letter',
    shortTitle: 'Complaint',
    category: 'bailiff',
    description:
      'Use this template to complain about bailiff misconduct or inappropriate behaviour.',
    whenToUse: [
      'A bailiff has acted inappropriately',
      'You believe regulations have been breached',
      'You want to make a formal complaint',
    ],
    tips: [
      'Document everything - dates, times, what was said',
      'Complain first to the bailiff company',
      'You can escalate to the creditor (council) if not resolved',
      'Serious issues can be reported to enforcement industry bodies',
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
        key: 'BAILIFF_COMPANY',
        label: 'Bailiff Company Name',
        description: 'The name of the enforcement company',
        example: 'XYZ Enforcement Ltd',
        required: true,
        inputType: 'text',
      },
      {
        key: 'BAILIFF_ADDRESS',
        label: 'Bailiff Company Address',
        description: 'Their postal address',
        example: 'Enforcement House, Business Park, London, EC1A 1AA',
        required: true,
        inputType: 'address',
      },
      {
        key: 'REFERENCE_NUMBER',
        label: 'Reference Number',
        description: 'Your case or debt reference number',
        example: 'ENF123456',
        required: true,
        inputType: 'text',
      },
      {
        key: 'BAILIFF_NAME',
        label: 'Bailiff Name/ID',
        description: 'Name or ID of the bailiff you are complaining about',
        example: 'Mr J Brown / Badge Number 12345',
        required: true,
        inputType: 'text',
      },
      {
        key: 'INCIDENT_DATE',
        label: 'Date of Incident',
        description: 'When the incident occurred',
        example: '1 February 2026',
        required: true,
        inputType: 'date',
      },
      {
        key: 'COMPLAINT_DETAILS',
        label: 'Complaint Details',
        description: 'What happened and why you are complaining',
        example: 'On the above date, the bailiff...',
        required: true,
        inputType: 'textarea',
      },
    ],
    content: `[YOUR_NAME]
[YOUR_ADDRESS]

[DATE]

Complaints Department
[BAILIFF_COMPANY]
[BAILIFF_ADDRESS]

Dear Sir/Madam,

RE: Formal Complaint
Reference Number: [REFERENCE_NUMBER]
Bailiff: [BAILIFF_NAME]
Date of Incident: [INCIDENT_DATE]

I am writing to make a formal complaint about the conduct of the above-named bailiff/enforcement agent.

COMPLAINT DETAILS

[COMPLAINT_DETAILS]

I believe this conduct breaches:
- The Taking Control of Goods Regulations 2013
- The Enforcement Agent Code of Practice
- [Any other relevant regulations]

RESOLUTION SOUGHT

I request that you:
1. Investigate this complaint thoroughly
2. Take appropriate disciplinary action
3. Provide a written apology
4. [Any other resolution sought]

Please respond within 14 days with confirmation that this complaint is being investigated.

If I do not receive a satisfactory response, I will escalate this complaint to:
- The original creditor (council)
- The Local Government and Social Care Ombudsman
- The Certification Officer

Yours faithfully,

[YOUR_NAME]`,
    legalDisclaimer:
      'This template is provided for informational purposes only. Serious allegations should be supported by evidence where possible.',
  },
  {
    id: 'vulnerable-person',
    title: 'Vulnerable Person Letter',
    shortTitle: 'Vulnerability',
    category: 'bailiff',
    description:
      'Use this template to inform bailiffs of vulnerability that should be taken into account.',
    whenToUse: [
      'You or someone in your household is vulnerable',
      'You have a disability, illness, or mental health condition',
      'There are children in the household',
      'English is not your first language',
    ],
    tips: [
      'Bailiffs must take vulnerability into account',
      'They may be required to refer the case back to the creditor',
      'Provide evidence of vulnerability if possible',
      'This doesn\'t cancel the debt but should affect how it\'s handled',
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
        key: 'BAILIFF_COMPANY',
        label: 'Bailiff Company Name',
        description: 'The name of the enforcement company',
        example: 'XYZ Enforcement Ltd',
        required: true,
        inputType: 'text',
      },
      {
        key: 'BAILIFF_ADDRESS',
        label: 'Bailiff Company Address',
        description: 'Their postal address',
        example: 'Enforcement House, Business Park, London, EC1A 1AA',
        required: true,
        inputType: 'address',
      },
      {
        key: 'REFERENCE_NUMBER',
        label: 'Reference Number',
        description: 'Your case or debt reference number',
        example: 'ENF123456',
        required: true,
        inputType: 'text',
      },
      {
        key: 'VULNERABILITY_DETAILS',
        label: 'Vulnerability Details',
        description: 'Explain the nature of the vulnerability',
        example: 'I suffer from severe anxiety and depression...',
        required: true,
        inputType: 'textarea',
      },
    ],
    content: `[YOUR_NAME]
[YOUR_ADDRESS]

[DATE]

[BAILIFF_COMPANY]
[BAILIFF_ADDRESS]

Dear Sir/Madam,

RE: Notification of Vulnerability
Reference Number: [REFERENCE_NUMBER]

I am writing to inform you of circumstances that I believe constitute vulnerability under the Taking Control of Goods Regulations 2013 and the Enforcement Agent Code of Practice.

NATURE OF VULNERABILITY

[VULNERABILITY_DETAILS]

IMPACT ON ENFORCEMENT

I request that you take this vulnerability into account when considering any enforcement action. Under the regulations and code of practice, enforcement agents should:

- Not take enforcement action if it would be inappropriate given the vulnerability
- Consider referring the case back to the creditor
- Allow more time for payment arrangements
- Act with sensitivity and understanding

I am not seeking to avoid my responsibilities, but I ask that enforcement is conducted in a way that takes my circumstances into account.

I have enclosed supporting documentation [if applicable].

Please confirm receipt of this letter and how you will take this information into account.

Yours faithfully,

[YOUR_NAME]`,
    legalDisclaimer:
      'This template is provided for informational purposes only. Vulnerability should be supported by evidence where possible (e.g., doctor\'s letter, benefits documentation).',
  },
];
