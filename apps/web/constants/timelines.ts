import { TicketStatus, IssuerType } from '@parking-ticket-pal/db/types';

export type TimelineStage = {
  id: string;
  title: string;
  description: string;
  statusMapping: TicketStatus[];
  stageType:
    | 'initial'
    | 'payment'
    | 'appeal'
    | 'enforcement'
    | 'legal'
    | 'bailiff'
    | 'closed';
  actions: {
    label: string;
    type: 'PAYMENT' | 'FORM' | 'CHALLENGE' | 'INFO';
  }[];
  nextStages: string[];
};

export const councilTimeline: TimelineStage[] = [
  {
    id: 'pcn_issued',
    title: 'PCN Issued',
    description:
      'The ticket was issued by a Civil Enforcement Officer or by post. The clock has started.',
    statusMapping: [TicketStatus.ISSUED_DISCOUNT_PERIOD],
    stageType: 'initial',
    actions: [
      { label: 'Pay at 50% discount', type: 'PAYMENT' },
      { label: 'Make informal challenge', type: 'CHALLENGE' },
    ],
    nextStages: ['full_amount_due'],
  },
  {
    id: 'full_amount_due',
    title: 'Full Amount Due',
    description:
      'The 14-day discount period has ended. The full penalty amount is now due.',
    statusMapping: [TicketStatus.ISSUED_FULL_CHARGE],
    stageType: 'payment',
    actions: [
      { label: 'Pay full amount', type: 'PAYMENT' },
      { label: 'Wait for Notice to Owner', type: 'INFO' },
    ],
    nextStages: ['notice_to_owner'],
  },
  {
    id: 'notice_to_owner',
    title: 'Notice to Owner (NTO)',
    description:
      'A formal notice sent to the registered keeper. You have 28 days to pay or make a formal appeal.',
    statusMapping: [
      TicketStatus.NOTICE_TO_OWNER,
      TicketStatus.FORMAL_REPRESENTATION,
      TicketStatus.NOTICE_OF_REJECTION,
    ],
    stageType: 'legal',
    actions: [
      { label: 'Pay full amount', type: 'PAYMENT' },
      { label: 'Make formal representations', type: 'CHALLENGE' },
    ],
    nextStages: ['charge_certificate', 'closed_paid', 'closed_accepted'],
  },
  {
    id: 'charge_certificate',
    title: 'Charge Certificate',
    description:
      'The penalty has increased by 50% due to non-payment. You have 14 days to pay the new amount.',
    statusMapping: [TicketStatus.CHARGE_CERTIFICATE],
    stageType: 'enforcement',
    actions: [{ label: 'Pay increased fine', type: 'PAYMENT' }],
    nextStages: ['order_for_recovery'],
  },
  {
    id: 'order_for_recovery',
    title: 'Order for Recovery',
    description:
      'The debt is registered with the Traffic Enforcement Centre (TEC). Court fees are added. You can file a Witness Statement (TE9).',
    statusMapping: [TicketStatus.ORDER_FOR_RECOVERY],
    stageType: 'legal',
    actions: [
      { label: 'Pay the outstanding amount', type: 'PAYMENT' },
      { label: 'File a Witness Statement (TE9)', type: 'FORM' },
      { label: 'File an Out of Time application (TE7)', type: 'FORM' },
    ],
    nextStages: ['warrant_of_control', 'closed_paid'],
  },
  {
    id: 'warrant_of_control',
    title: 'Warrant of Control (Bailiffs)',
    description:
      'The case has been passed to Enforcement Agents (bailiffs). Significant fees will be added.',
    statusMapping: [TicketStatus.ENFORCEMENT_BAILIFF_STAGE],
    stageType: 'bailiff',
    actions: [{ label: 'Contact bailiffs immediately', type: 'INFO' }],
    nextStages: ['closed_paid'],
  },
  {
    id: 'closed_paid',
    title: 'Case Closed: Paid',
    description:
      'The penalty charge has been paid in full and the case is now closed.',
    statusMapping: [TicketStatus.PAID],
    stageType: 'closed',
    actions: [],
    nextStages: [],
  },
  {
    id: 'closed_accepted',
    title: 'Case Closed: Appeal Accepted',
    description:
      'Your appeal was successful and the penalty charge has been cancelled.',
    statusMapping: [
      TicketStatus.REPRESENTATION_ACCEPTED,
      TicketStatus.APPEAL_UPHELD,
      TicketStatus.CANCELLED,
    ],
    stageType: 'closed',
    actions: [],
    nextStages: [],
  },
];

export const tflTimeline: TimelineStage[] = [
  {
    id: 'pcn_issued',
    title: 'PCN Issued',
    description:
      'The penalty charge notice was issued by Transport for London. The 14-day discount period has started.',
    statusMapping: [TicketStatus.ISSUED_DISCOUNT_PERIOD],
    stageType: 'initial',
    actions: [
      { label: 'Pay at 50% discount', type: 'PAYMENT' },
      { label: 'Make informal challenge', type: 'CHALLENGE' },
    ],
    nextStages: ['full_amount_due'],
  },
  {
    id: 'full_amount_due',
    title: 'Full Amount Due',
    description:
      'The 14-day discount period has ended. The full penalty amount is now due.',
    statusMapping: [TicketStatus.ISSUED_FULL_CHARGE],
    stageType: 'payment',
    actions: [
      { label: 'Pay full amount', type: 'PAYMENT' },
      { label: 'Wait for Enforcement Notice', type: 'INFO' },
    ],
    nextStages: ['enforcement_notice'],
  },
  {
    id: 'enforcement_notice',
    title: 'Enforcement Notice',
    description:
      'A formal enforcement notice sent to the registered keeper. You have 28 days to pay or make a formal representation.',
    statusMapping: [
      TicketStatus.NOTICE_TO_OWNER,
      TicketStatus.FORMAL_REPRESENTATION,
      TicketStatus.NOTICE_OF_REJECTION,
    ],
    stageType: 'legal',
    actions: [
      { label: 'Pay full amount', type: 'PAYMENT' },
      { label: 'Make formal representations', type: 'CHALLENGE' },
    ],
    nextStages: ['charge_certificate', 'closed_paid', 'closed_accepted'],
  },
  {
    id: 'charge_certificate',
    title: 'Charge Certificate',
    description:
      'The penalty has increased by 50% due to non-payment. You have 14 days to pay the new amount.',
    statusMapping: [TicketStatus.CHARGE_CERTIFICATE],
    stageType: 'enforcement',
    actions: [{ label: 'Pay increased fine', type: 'PAYMENT' }],
    nextStages: ['order_for_recovery'],
  },
  {
    id: 'order_for_recovery',
    title: 'Order for Recovery',
    description:
      'The debt is registered with the Traffic Enforcement Centre (TEC). Court fees are added. You can file a Witness Statement (TE9).',
    statusMapping: [TicketStatus.ORDER_FOR_RECOVERY],
    stageType: 'legal',
    actions: [
      { label: 'Pay the outstanding amount', type: 'PAYMENT' },
      { label: 'File a Witness Statement (TE9)', type: 'FORM' },
      { label: 'File an Out of Time application (TE7)', type: 'FORM' },
    ],
    nextStages: ['warrant_of_control', 'closed_paid'],
  },
  {
    id: 'warrant_of_control',
    title: 'Warrant of Control (Bailiffs)',
    description:
      'The case has been passed to Enforcement Agents (bailiffs). Significant fees will be added.',
    statusMapping: [TicketStatus.ENFORCEMENT_BAILIFF_STAGE],
    stageType: 'bailiff',
    actions: [{ label: 'Contact bailiffs immediately', type: 'INFO' }],
    nextStages: ['closed_paid'],
  },
  {
    id: 'closed_paid',
    title: 'Case Closed: Paid',
    description:
      'The penalty charge has been paid in full and the case is now closed.',
    statusMapping: [TicketStatus.PAID],
    stageType: 'closed',
    actions: [],
    nextStages: [],
  },
  {
    id: 'closed_accepted',
    title: 'Case Closed: Appeal Accepted',
    description:
      'Your appeal was successful and the penalty charge has been cancelled.',
    statusMapping: [
      TicketStatus.REPRESENTATION_ACCEPTED,
      TicketStatus.APPEAL_UPHELD,
      TicketStatus.CANCELLED,
    ],
    stageType: 'closed',
    actions: [],
    nextStages: [],
  },
];

export const privateCompanyTimeline: TimelineStage[] = [
  {
    id: 'pcn_issued',
    title: 'PCN Issued',
    description:
      'The parking charge notice was issued by a private parking company. The 14-day discount period has started.',
    statusMapping: [TicketStatus.ISSUED_DISCOUNT_PERIOD],
    stageType: 'initial',
    actions: [
      { label: 'Pay at 50% discount', type: 'PAYMENT' },
      { label: 'Make informal challenge', type: 'CHALLENGE' },
    ],
    nextStages: ['full_amount_due'],
  },
  {
    id: 'full_amount_due',
    title: 'Full Amount Due',
    description:
      'The 14-day discount period has ended. The full penalty amount is now due.',
    statusMapping: [TicketStatus.ISSUED_FULL_CHARGE],
    stageType: 'payment',
    actions: [
      { label: 'Pay full amount', type: 'PAYMENT' },
      { label: 'Submit appeal to operator', type: 'CHALLENGE' },
    ],
    nextStages: ['notice_to_keeper', 'appeal_submitted'],
  },
  {
    id: 'notice_to_keeper',
    title: 'Notice to Keeper',
    description:
      'A formal notice sent to the registered keeper. You have 28 days to pay or appeal.',
    statusMapping: [TicketStatus.NOTICE_TO_KEEPER],
    stageType: 'legal',
    actions: [
      { label: 'Pay full amount', type: 'PAYMENT' },
      { label: 'Submit appeal to operator', type: 'CHALLENGE' },
    ],
    nextStages: ['debt_collection'],
  },
  {
    id: 'appeal_submitted',
    title: 'Appeal Submitted to Operator',
    description:
      'Your appeal has been submitted to the parking company. They have 56 days to respond.',
    statusMapping: [TicketStatus.APPEAL_SUBMITTED_TO_OPERATOR],
    stageType: 'appeal',
    actions: [
      { label: 'Wait for operator response', type: 'INFO' },
      { label: 'Pay to settle the case', type: 'PAYMENT' },
    ],
    nextStages: ['appeal_upheld', 'appeal_rejected_operator'],
  },
  {
    id: 'appeal_rejected_operator',
    title: 'Appeal Rejected by Operator',
    description:
      'The parking company has rejected your appeal. You can now appeal to POPLA (Parking on Private Land Appeals).',
    statusMapping: [TicketStatus.APPEAL_REJECTED_BY_OPERATOR],
    stageType: 'appeal',
    actions: [
      { label: 'Appeal to POPLA', type: 'CHALLENGE' },
      { label: 'Pay to settle the case', type: 'PAYMENT' },
    ],
    nextStages: ['popla_appeal'],
  },
  {
    id: 'popla_appeal',
    title: 'POPLA Appeal',
    description:
      'Your appeal has been submitted to POPLA (Parking on Private Land Appeals). This is the final appeal stage.',
    statusMapping: [TicketStatus.POPLA_APPEAL],
    stageType: 'appeal',
    actions: [
      { label: 'Wait for POPLA decision', type: 'INFO' },
      { label: 'Pay to settle the case', type: 'PAYMENT' },
    ],
    nextStages: ['appeal_upheld', 'appeal_rejected'],
  },
  {
    id: 'appeal_upheld',
    title: 'Appeal Upheld',
    description:
      'Your appeal was successful and the parking charge has been cancelled.',
    statusMapping: [TicketStatus.APPEAL_UPHELD],
    stageType: 'closed',
    actions: [],
    nextStages: [],
  },
  {
    id: 'appeal_rejected',
    title: 'Appeal Rejected',
    description:
      'Your appeal was unsuccessful. The parking charge remains due and may be passed to debt collection.',
    statusMapping: [TicketStatus.APPEAL_REJECTED],
    stageType: 'appeal',
    actions: [{ label: 'Pay the outstanding amount', type: 'PAYMENT' }],
    nextStages: ['debt_collection'],
  },
  {
    id: 'debt_collection',
    title: 'Debt Collection',
    description:
      'The case has been passed to debt collection agencies. Additional fees may be added.',
    statusMapping: [TicketStatus.DEBT_COLLECTION],
    stageType: 'enforcement',
    actions: [
      { label: 'Pay to settle the debt', type: 'PAYMENT' },
      { label: 'Contact debt collectors', type: 'INFO' },
    ],
    nextStages: ['court_proceedings'],
  },
  {
    id: 'court_proceedings',
    title: 'Court Proceedings',
    description:
      'The parking company has filed a claim in the County Court. You must respond within 14 days.',
    statusMapping: [TicketStatus.COURT_PROCEEDINGS],
    stageType: 'legal',
    actions: [
      { label: 'Pay to settle the claim', type: 'PAYMENT' },
      { label: 'File a defence', type: 'FORM' },
    ],
    nextStages: ['ccj_issued'],
  },
  {
    id: 'ccj_issued',
    title: 'County Court Judgment',
    description:
      'A County Court Judgment has been issued against you. This will affect your credit rating.',
    statusMapping: [TicketStatus.CCJ_ISSUED],
    stageType: 'legal',
    actions: [
      { label: 'Pay the judgment debt', type: 'PAYMENT' },
      { label: 'Apply to set aside CCJ', type: 'FORM' },
    ],
    nextStages: ['closed_paid'],
  },
  {
    id: 'closed_paid',
    title: 'Case Closed: Paid',
    description:
      'The parking charge has been paid in full and the case is now closed.',
    statusMapping: [TicketStatus.PAID],
    stageType: 'closed',
    actions: [],
    nextStages: [],
  },
];

export const getTimelineByIssuer = (
  issuerType: IssuerType,
): TimelineStage[] => {
  switch (issuerType) {
    case 'COUNCIL':
      return councilTimeline;
    case 'TFL':
      return tflTimeline;
    case 'PRIVATE_COMPANY':
      return privateCompanyTimeline;
    default:
      return councilTimeline;
  }
};
