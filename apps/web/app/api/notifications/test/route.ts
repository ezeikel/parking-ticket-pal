import { db as prisma } from '@parking-ticket-pal/db';
import { getUserId } from '@/utils/user';
import { createAndSendNotification } from '@/lib/notifications/create';

// Dev-only endpoint to seed dummy notifications and trigger a test push
export const POST = async (req: Request) => {
  if (process.env.NODE_ENV === 'production') {
    return Response.json(
      { error: 'Not available in production' },
      { status: 404 },
    );
  }

  const authenticatedUserId = await getUserId('test notifications');
  if (!authenticatedUserId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action') || 'seed';

  if (action === 'push') {
    // Send a real push notification to the user's device
    const result = await createAndSendNotification({
      userId: authenticatedUserId,
      type: 'TICKET_DEADLINE_REMINDER',
      title: '⏰ Deadline approaching',
      body: 'Your PCN AB12345678 challenge deadline is in 3 days. Act now to avoid a fine increase.',
      data: { test: true },
    });

    return Response.json({ success: true, action: 'push', result });
  }

  // Default: seed dummy notifications
  const now = new Date();

  const dummyNotifications = [
    {
      userId: authenticatedUserId,
      ticketId: null,
      type: 'TICKET_DEADLINE_REMINDER' as const,
      title: 'Deadline approaching',
      body: 'Your PCN WK82947163 challenge deadline is in 3 days. Submit your challenge now to avoid the fine increasing to £130.',
      data: {},
      read: false,
      createdAt: new Date(now.getTime() - 1000 * 60 * 12), // 12 min ago
    },
    {
      userId: authenticatedUserId,
      ticketId: null,
      type: 'TICKET_STATUS_UPDATE' as const,
      title: 'Challenge submitted',
      body: "Your challenge for PCN LB73051948 has been successfully submitted to Lewisham Council. We'll notify you when they respond.",
      data: {},
      read: false,
      createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 2), // 2 hours ago
    },
    {
      userId: authenticatedUserId,
      ticketId: null,
      type: 'APPEAL_RESPONSE_RECEIVED' as const,
      title: 'Challenge accepted!',
      body: 'Great news! Westminster Council has accepted your challenge for PCN WM29481057. Your fine has been cancelled.',
      data: {},
      read: false,
      createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 5), // 5 hours ago
    },
    {
      userId: authenticatedUserId,
      ticketId: null,
      type: 'CHALLENGE_COMPLETE' as const,
      title: 'Challenge letter ready',
      body: 'Your AI-assisted challenge letter for PCN HZ64839201 is ready for review. Tap to review and approve before we submit.',
      data: {},
      read: true,
      readAt: new Date(now.getTime() - 1000 * 60 * 60 * 20),
      createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 24), // 1 day ago
    },
    {
      userId: authenticatedUserId,
      ticketId: null,
      type: 'FORM_DEADLINE_REMINDER' as const,
      title: 'Form deadline reminder',
      body: 'The PE2 form for your PCN TF40182736 needs to be submitted within 5 days. Complete the remaining fields to proceed.',
      data: {},
      read: true,
      readAt: new Date(now.getTime() - 1000 * 60 * 60 * 40),
      createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 48), // 2 days ago
    },
    {
      userId: authenticatedUserId,
      ticketId: null,
      type: 'PAYMENT_DUE' as const,
      title: 'Fine increase warning',
      body: 'Your PCN NS51029384 fine will increase from £65 to £130 in 7 days if no challenge is submitted. Start your challenge now.',
      data: {},
      read: true,
      readAt: new Date(now.getTime() - 1000 * 60 * 60 * 70),
      createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 72), // 3 days ago
    },
    {
      userId: authenticatedUserId,
      ticketId: null,
      type: 'APPEAL_SUBMITTED' as const,
      title: 'Appeal submitted to tribunal',
      body: 'Your formal appeal for PCN HZ92740183 has been submitted to the Environment and Traffic Adjudicators tribunal.',
      data: {},
      read: true,
      readAt: new Date(now.getTime() - 1000 * 60 * 60 * 100),
      createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 120), // 5 days ago
    },
    {
      userId: authenticatedUserId,
      ticketId: null,
      type: 'TICKET_STATUS_UPDATE' as const,
      title: 'Ticket verified',
      body: "We've verified your PCN BX83619204 with the issuing authority. Your ticket details have been updated.",
      data: {},
      read: true,
      readAt: new Date(now.getTime() - 1000 * 60 * 60 * 150),
      createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 168), // 7 days ago
    },
  ];

  const created = await prisma.notification.createMany({
    data: dummyNotifications,
  });

  return Response.json({
    success: true,
    action: 'seed',
    count: created.count,
    message: `Created ${created.count} dummy notifications. Pull to refresh in the app.`,
  });
};

// Allow cleanup
export const DELETE = async () => {
  if (process.env.NODE_ENV === 'production') {
    return Response.json(
      { error: 'Not available in production' },
      { status: 404 },
    );
  }

  const authenticatedUserId = await getUserId('test notifications cleanup');
  if (!authenticatedUserId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const deleted = await prisma.notification.deleteMany({
    where: {
      userId: authenticatedUserId,
      ticketId: null, // Only delete dummy ones (no real ticket attached)
    },
  });

  return Response.json({
    success: true,
    count: deleted.count,
    message: `Deleted ${deleted.count} test notifications.`,
  });
};
