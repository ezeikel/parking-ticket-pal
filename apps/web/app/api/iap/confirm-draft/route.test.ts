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
import { decrypt } from '@/app/lib/session';
import { POST } from './route';

vi.mock('@parking-ticket-pal/db', () => ({
  db: {
    draftTicket: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    user: {
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
  TicketTier: { FREE: 'FREE', PREMIUM: 'PREMIUM' },
}));

vi.mock('@/lib/revenuecat', () => ({
  verifyPurchase: vi.fn(),
}));

vi.mock('@/app/lib/session', () => ({
  decrypt: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  createServerLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

const mockDb = db as Mocked<typeof db>;
const mockVerifyPurchase = verifyPurchase as MockedFunction<
  typeof verifyPurchase
>;
const mockDecrypt = decrypt as MockedFunction<typeof decrypt>;

function makeRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/iap/confirm-draft', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer valid-token',
    },
    body: JSON.stringify(body),
  });
}

describe('POST /api/iap/confirm-draft', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDecrypt.mockResolvedValue({ id: 'user1' });
  });

  it('creates draft ticket on valid purchase', async () => {
    mockVerifyPurchase.mockResolvedValue(true);
    (mockDb.draftTicket.findFirst as Mock).mockResolvedValue(null);
    (mockDb.$transaction as Mock).mockResolvedValue([
      { id: 'draft-new', tier: 'PREMIUM' },
      {},
    ]);

    const res = await POST(makeRequest({ productId: 'premium_ticket_v1' }));

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.draftTicket.id).toBe('draft-new');
    expect(body.draftTicket.tier).toBe('PREMIUM');
    expect(mockDb.$transaction).toHaveBeenCalled();
  });

  it('accepts premium_ticket_internal_v1 product ID', async () => {
    mockVerifyPurchase.mockResolvedValue(true);
    (mockDb.draftTicket.findFirst as Mock).mockResolvedValue(null);
    (mockDb.$transaction as Mock).mockResolvedValue([
      { id: 'draft-internal', tier: 'PREMIUM' },
      {},
    ]);

    const res = await POST(
      makeRequest({ productId: 'premium_ticket_internal_v1' }),
    );

    expect(res.status).toBe(201);
    expect((await res.json()).draftTicket.tier).toBe('PREMIUM');
  });

  it('returns existing draft idempotently', async () => {
    mockVerifyPurchase.mockResolvedValue(true);
    (mockDb.draftTicket.findFirst as Mock).mockResolvedValue({
      id: 'draft1',
      tier: 'PREMIUM',
    });

    const res = await POST(makeRequest({ productId: 'premium_ticket_v1' }));

    expect(res.status).toBe(200);
    expect((await res.json()).draftTicket.id).toBe('draft1');
    expect(mockDb.$transaction).not.toHaveBeenCalled();
  });

  it('rejects when RevenueCat verification fails', async () => {
    mockVerifyPurchase.mockResolvedValue(false);

    const res = await POST(makeRequest({ productId: 'premium_ticket_v1' }));

    expect(res.status).toBe(400);
    expect(mockDb.$transaction).not.toHaveBeenCalled();
  });
});
