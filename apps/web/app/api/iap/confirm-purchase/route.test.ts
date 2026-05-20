// @vitest-environment node
import {
  describe,
  it,
  expect,
  beforeEach,
  vi,
  type Mock,
  type Mocked,
  type MockedFunction,
} from 'vitest';
import { db } from '@parking-ticket-pal/db';
import { verifyPurchase } from '@/lib/revenuecat';
import { POST } from './route';

vi.mock('@sentry/nextjs', () => ({
  startSpan: (_opts: any, fn: (span: any) => any) =>
    fn({ setAttributes: vi.fn() }),
}));

vi.mock('@parking-ticket-pal/db', () => ({
  db: {
    ticket: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    user: {
      update: vi.fn(),
    },
  },
  TicketTier: { FREE: 'FREE', PREMIUM: 'PREMIUM' },
  OnboardingExitReason: { UPGRADED: 'UPGRADED' },
}));

vi.mock('@/lib/revenuecat', () => ({
  verifyPurchase: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  createServerLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock('@/services/onboarding-sequence', () => ({
  exitOnboardingSequenceForTicket: vi.fn().mockResolvedValue(undefined),
}));

const mockDb = db as Mocked<typeof db>;
const mockVerifyPurchase = verifyPurchase as MockedFunction<
  typeof verifyPurchase
>;

function makeRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/iap/confirm-purchase', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': 'user1',
    },
    body: JSON.stringify(body),
  });
}

const freeTicket = {
  id: 'ticket1',
  tier: 'FREE',
  pcnNumber: 'PCN123',
  vehicle: { userId: 'user1' },
};

describe('POST /api/iap/confirm-purchase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('upgrades ticket to PREMIUM and updates user', async () => {
    (mockDb.ticket.findFirst as Mock).mockResolvedValue(freeTicket);
    mockVerifyPurchase.mockResolvedValue(true);
    (mockDb.ticket.update as Mock).mockResolvedValue({
      ...freeTicket,
      tier: 'PREMIUM',
    });
    (mockDb.user.update as Mock).mockResolvedValue({});

    const res = await POST(
      makeRequest({ ticketId: 'ticket1', productId: 'premium_ticket_v1' }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ticket.tier).toBe('PREMIUM');

    expect(mockDb.ticket.update).toHaveBeenCalledWith({
      where: { id: 'ticket1' },
      data: { tier: 'PREMIUM' },
      include: { vehicle: true },
    });
    expect(mockDb.user.update).toHaveBeenCalledWith({
      where: { id: 'user1' },
      data: { lastPremiumPurchaseAt: expect.any(Date) },
    });
  });

  it('accepts premium_ticket_internal_v1 product ID', async () => {
    (mockDb.ticket.findFirst as Mock).mockResolvedValue(freeTicket);
    mockVerifyPurchase.mockResolvedValue(true);
    (mockDb.ticket.update as Mock).mockResolvedValue({
      ...freeTicket,
      tier: 'PREMIUM',
    });
    (mockDb.user.update as Mock).mockResolvedValue({});

    const res = await POST(
      makeRequest({
        ticketId: 'ticket1',
        productId: 'premium_ticket_internal_v1',
      }),
    );

    expect(res.status).toBe(200);
    expect((await res.json()).ticket.tier).toBe('PREMIUM');
  });

  it('returns success idempotently when ticket already PREMIUM', async () => {
    (mockDb.ticket.findFirst as Mock).mockResolvedValue({
      ...freeTicket,
      tier: 'PREMIUM',
    });

    const res = await POST(
      makeRequest({ ticketId: 'ticket1', productId: 'premium_ticket_v1' }),
    );

    expect(res.status).toBe(200);
    expect((await res.json()).message).toBe('Ticket already has Premium tier');
    expect(mockVerifyPurchase).not.toHaveBeenCalled();
    expect(mockDb.ticket.update).not.toHaveBeenCalled();
  });

  it('rejects when RevenueCat verification fails', async () => {
    (mockDb.ticket.findFirst as Mock).mockResolvedValue(freeTicket);
    mockVerifyPurchase.mockResolvedValue(false);

    const res = await POST(
      makeRequest({ ticketId: 'ticket1', productId: 'premium_ticket_v1' }),
    );

    expect(res.status).toBe(400);
    expect(mockDb.ticket.update).not.toHaveBeenCalled();
  });
});
