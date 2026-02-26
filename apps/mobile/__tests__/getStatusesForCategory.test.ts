import { getStatusesForCategory } from '../hooks/useTicketFilters';
import { TicketStatus } from '../types';

describe('getStatusesForCategory', () => {
  it('returns empty array for "all" category', () => {
    expect(getStatusesForCategory('all')).toEqual([]);
  });

  it('returns action-required statuses for "needs_action"', () => {
    const statuses = getStatusesForCategory('needs_action');
    expect(statuses).toContain(TicketStatus.ISSUED_DISCOUNT_PERIOD);
    expect(statuses).toContain(TicketStatus.ISSUED_FULL_CHARGE);
    expect(statuses).toContain(TicketStatus.NOTICE_TO_OWNER);
    expect(statuses).toContain(TicketStatus.NOTICE_TO_KEEPER);
    expect(statuses).toHaveLength(4);
  });

  it('returns pending statuses for "pending"', () => {
    const statuses = getStatusesForCategory('pending');
    expect(statuses).toContain(TicketStatus.FORMAL_REPRESENTATION);
    expect(statuses).toContain(TicketStatus.APPEAL_TO_TRIBUNAL);
    expect(statuses).toHaveLength(5);
  });

  it('returns won statuses for "won"', () => {
    const statuses = getStatusesForCategory('won');
    expect(statuses).toContain(TicketStatus.REPRESENTATION_ACCEPTED);
    expect(statuses).toContain(TicketStatus.APPEAL_UPHELD);
    expect(statuses).toContain(TicketStatus.APPEAL_SUCCESSFUL);
    expect(statuses).toHaveLength(3);
  });

  it('returns lost statuses for "lost"', () => {
    const statuses = getStatusesForCategory('lost');
    expect(statuses).toContain(TicketStatus.NOTICE_OF_REJECTION);
    expect(statuses).toContain(TicketStatus.APPEAL_REJECTED_BY_OPERATOR);
    expect(statuses).toContain(TicketStatus.APPEAL_REJECTED);
    expect(statuses).toHaveLength(3);
  });

  it('returns paid status for "paid"', () => {
    const statuses = getStatusesForCategory('paid');
    expect(statuses).toEqual([TicketStatus.PAID]);
  });
});
