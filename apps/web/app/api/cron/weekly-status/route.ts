import { NextResponse } from 'next/server';
import { render } from '@react-email/render';
import { db } from '@parking-ticket-pal/db';
import { createServerLogger } from '@/lib/logger';
import { sendEmail } from '@/lib/email';
import stripe from '@/lib/stripe';
import WeeklyStatusEmail from '@/emails/WeeklyStatusEmail';
import type { WeeklyStatusEmailProps } from '@/emails/WeeklyStatusEmail';

const logger = createServerLogger({ action: 'cron-weekly-status' });

const STATUS_EMAIL_RECIPIENT =
  process.env.STATUS_EMAIL_RECIPIENT || 'billing@chewybytes.com';

// --- Data Fetchers ---

async function fetchStripeData() {
  try {
    const sevenDaysAgo = Math.floor(
      (Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000,
    );

    // Get recent charges (last 7 days)
    const charges = await stripe.charges.list({
      created: { gte: sevenDaysAgo },
      limit: 100,
    });

    const revenue7d =
      charges.data
        .filter((c) => c.paid && !c.refunded)
        .reduce((sum, c) => sum + c.amount, 0) / 100;

    // Get customer count
    const customers = await stripe.customers.list({ limit: 1 });
    const customerCount =
      customers.data.length > 0
        ? (await stripe.customers.list({ limit: 100 })).data.length
        : 0;

    return { mrr: 0, revenue7d, customers: customerCount };
  } catch (error) {
    logger.error(
      'Failed to fetch Stripe data',
      {},
      error instanceof Error ? error : undefined,
    );
    return { mrr: 0, revenue7d: 0, customers: 0 };
  }
}

async function fetchRevenueCatData() {
  const rcApiKey = process.env.REVENUECAT_API_KEY;
  const rcProjectId = process.env.REVENUECAT_PROJECT_ID;
  if (!rcApiKey || !rcProjectId) {
    return { mrr: 0, activeUsers: 0, newCustomers: 0, transactions: 0 };
  }

  try {
    const response = await fetch(
      `https://api.revenuecat.com/v2/projects/${rcProjectId}/metrics/overview?currency=GBP`,
      {
        headers: {
          Authorization: `Bearer ${rcApiKey}`,
          'Content-Type': 'application/json',
        },
      },
    );

    if (!response.ok) {
      throw new Error(`RevenueCat API ${response.status}`);
    }

    const data = await response.json();
    const metrics = data?.metrics ?? [];

    const getMetricValue = (id: string) =>
      metrics.find((m: { id: string; value: number }) => m.id === id)?.value ??
      0;

    return {
      mrr: getMetricValue('mrr'),
      activeUsers: getMetricValue('active_users'),
      newCustomers: getMetricValue('new_customers'),
      transactions: getMetricValue('num_tx_last_28_days'),
    };
  } catch (error) {
    logger.error(
      'Failed to fetch RevenueCat data',
      {},
      error instanceof Error ? error : undefined,
    );
    return { mrr: 0, activeUsers: 0, newCustomers: 0, transactions: 0 };
  }
}

async function fetchPostHogMetrics() {
  const posthogKey = process.env.POSTHOG_PERSONAL_API_KEY;
  const projectId = '78799';
  if (!posthogKey) {
    return {
      wau: 0,
      newSignups7d: 0,
      ticketsCreated7d: 0,
      paywallOpened7d: 0,
      checkoutStarted7d: 0,
      purchaseCompleted7d: 0,
      purchaseCancelled7d: 0,
      blogViews7d: 0,
      topBlogPosts: [],
    };
  }

  const runQuery = async (query: object) => {
    const response = await fetch(
      `https://eu.posthog.com/api/projects/${projectId}/query/`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${posthogKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      },
    );
    if (!response.ok) throw new Error(`PostHog API ${response.status}`);
    return response.json();
  };

  try {
    // Run trend queries for key events — 28d with weekly interval for sparklines
    const trendQuery = {
      kind: 'InsightVizNode',
      source: {
        kind: 'TrendsQuery',
        dateRange: { date_from: '-28d' },
        series: [
          {
            kind: 'EventsNode',
            event: '$pageview',
            custom_name: 'WAU',
            math: 'dau',
          },
          {
            kind: 'EventsNode',
            event: 'ticket_created',
            custom_name: 'Tickets Created',
          },
          {
            kind: 'EventsNode',
            event: 'paywall_opened',
            custom_name: 'Paywall Opened',
          },
          {
            kind: 'EventsNode',
            event: 'checkout_session_created',
            custom_name: 'Checkout Started',
          },
          {
            kind: 'EventsNode',
            event: 'paywall_purchase_success',
            custom_name: 'Purchase Success',
          },
          {
            kind: 'EventsNode',
            event: 'paywall_purchase_cancelled',
            custom_name: 'Purchase Cancelled',
          },
          {
            kind: 'EventsNode',
            event: 'blog_post_viewed',
            custom_name: 'Blog Views',
          },
        ],
        interval: 'week',
      },
    };

    const trendResult = await runQuery(trendQuery);
    const results = trendResult?.results ?? [];

    // Get weekly data arrays (last 4 weeks)
    const getWeeklyData = (index: number): number[] =>
      (results[index]?.data ?? []).slice(-4);

    // Last week's value (last element)
    const getLastWeek = (index: number) => {
      const data = results[index]?.data ?? [0];
      return data[data.length - 1] ?? 0;
    };

    // WAU = max DAU from the last week's daily data
    const wauData = getWeeklyData(0);
    const wau = wauData[wauData.length - 1] ?? 0;

    // Blog post breakdown
    const blogQuery = {
      kind: 'InsightVizNode',
      source: {
        kind: 'TrendsQuery',
        dateRange: { date_from: '-7d' },
        series: [
          {
            kind: 'EventsNode',
            event: 'blog_post_viewed',
            custom_name: 'Blog Views',
          },
        ],
        breakdownFilter: {
          breakdown: '$current_url',
          breakdown_type: 'event',
          breakdown_limit: 5,
        },
      },
    };

    let topBlogPosts: { title: string; views: number }[] = [];
    try {
      const blogResult = await runQuery(blogQuery);
      topBlogPosts = (blogResult?.results ?? [])
        .map((r: { breakdown_value: string; data: number[] }) => ({
          title:
            r.breakdown_value
              ?.replace(/https?:\/\/[^/]+\/blog\//, '')
              .replace(/-/g, ' ') ?? 'Unknown',
          views: r.data?.reduce((a: number, b: number) => a + b, 0) ?? 0,
        }))
        .filter((p: { views: number }) => p.views > 0)
        .sort((a: { views: number }, b: { views: number }) => b.views - a.views)
        .slice(0, 5);
    } catch {
      // Blog breakdown is non-critical
    }

    // New signups — count first_ticket_created or use ticket_created with first_time_for_user
    const signupQuery = {
      kind: 'InsightVizNode',
      source: {
        kind: 'TrendsQuery',
        dateRange: { date_from: '-7d' },
        series: [
          {
            kind: 'EventsNode',
            event: 'first_ticket_created',
            custom_name: 'First Tickets',
          },
        ],
        interval: 'week',
      },
    };

    let newSignups7d = 0;
    try {
      const signupResult = await runQuery(signupQuery);
      newSignups7d =
        signupResult?.results?.[0]?.data?.reduce(
          (a: number, b: number) => a + b,
          0,
        ) ?? 0;
    } catch {
      // Non-critical
    }

    return {
      wau,
      wauTrend: wauData,
      newSignups7d,
      ticketsCreated7d: getLastWeek(1),
      ticketsTrend: getWeeklyData(1),
      paywallOpened7d: getLastWeek(2),
      checkoutStarted7d: getLastWeek(3),
      purchaseCompleted7d: getLastWeek(4),
      purchaseCancelled7d: getLastWeek(5),
      blogViews7d: getLastWeek(6),
      blogViewsTrend: getWeeklyData(6),
      topBlogPosts,
    };
  } catch (error) {
    logger.error(
      'Failed to fetch PostHog data',
      {},
      error instanceof Error ? error : undefined,
    );
    return {
      wau: 0,
      wauTrend: [],
      newSignups7d: 0,
      ticketsCreated7d: 0,
      ticketsTrend: [],
      paywallOpened7d: 0,
      checkoutStarted7d: 0,
      purchaseCompleted7d: 0,
      purchaseCancelled7d: 0,
      blogViews7d: 0,
      blogViewsTrend: [],
      topBlogPosts: [],
    };
  }
}

async function fetchSentryData() {
  const sentryToken = process.env.SENTRY_API_TOKEN;
  const org = 'chewybytes';
  if (!sentryToken) {
    return { unresolvedCount: 0, newThisWeek: 0, topIssues: [] };
  }

  try {
    // Search for unresolved issues sorted by event count
    const response = await fetch(
      `https://sentry.io/api/0/organizations/${org}/issues/?query=is:unresolved&sort=freq&limit=5`,
      {
        headers: { Authorization: `Bearer ${sentryToken}` },
      },
    );

    if (!response.ok) throw new Error(`Sentry API ${response.status}`);

    const issues = await response.json();

    const topIssues = issues.map(
      (issue: {
        shortId: string;
        title: string;
        culprit: string;
        count: string;
        userCount: number;
        permalink: string;
      }) => ({
        id: issue.shortId,
        title: issue.title,
        culprit: issue.culprit,
        events: parseInt(issue.count, 10),
        users: issue.userCount,
        url: issue.permalink,
      }),
    );

    // Get total unresolved count
    const totalHeader = response.headers.get('X-Hits');
    const unresolvedCount = totalHeader
      ? parseInt(totalHeader, 10)
      : issues.length;

    // Count new issues this week
    const sevenDaysAgo = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const newResponse = await fetch(
      `https://sentry.io/api/0/organizations/${org}/issues/?query=is:unresolved+firstSeen:>${sevenDaysAgo}&limit=0`,
      {
        headers: { Authorization: `Bearer ${sentryToken}` },
      },
    );

    const newThisWeek = newResponse.ok
      ? parseInt(newResponse.headers.get('X-Hits') || '0', 10)
      : 0;

    return { unresolvedCount, newThisWeek, topIssues };
  } catch (error) {
    logger.error(
      'Failed to fetch Sentry data',
      {},
      error instanceof Error ? error : undefined,
    );
    return { unresolvedCount: 0, newThisWeek: 0, topIssues: [] };
  }
}

async function fetchSocialMetrics() {
  const pageAccessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  const facebookPageId = process.env.FACEBOOK_PAGE_ID;
  const instagramAccountId = process.env.INSTAGRAM_ACCOUNT_ID;

  if (!pageAccessToken)
    return { facebookFollowers: null, instagramFollowers: null };

  let facebookFollowers: number | null = null;
  let instagramFollowers: number | null = null;

  try {
    if (facebookPageId) {
      const fbResponse = await fetch(
        `https://graph.facebook.com/v24.0/${facebookPageId}?fields=followers_count&access_token=${pageAccessToken}`,
      );
      if (fbResponse.ok) {
        const fbData = await fbResponse.json();
        facebookFollowers = fbData.followers_count ?? null;
      }
    }
  } catch {
    // Non-critical
  }

  try {
    if (instagramAccountId) {
      const igResponse = await fetch(
        `https://graph.facebook.com/v24.0/${instagramAccountId}?fields=followers_count&access_token=${pageAccessToken}`,
      );
      if (igResponse.ok) {
        const igData = await igResponse.json();
        instagramFollowers = igData.followers_count ?? null;
      }
    }
  } catch {
    // Non-critical
  }

  return { facebookFollowers, instagramFollowers };
}

async function fetchDbStats() {
  try {
    const [totalUsers, totalTickets, totalChallenges] = await Promise.all([
      db.user.count(),
      db.ticket.count(),
      db.challenge.count(),
    ]);
    return { totalUsers, totalTickets, totalChallenges };
  } catch (error) {
    logger.error(
      'Failed to fetch DB stats',
      {},
      error instanceof Error ? error : undefined,
    );
    return { totalUsers: 0, totalTickets: 0, totalChallenges: 0 };
  }
}

// --- Action Item Generator ---

function generateActionItems(
  props: Omit<WeeklyStatusEmailProps, 'actionItems' | 'weekEnding'>,
): WeeklyStatusEmailProps['actionItems'] {
  const items: WeeklyStatusEmailProps['actionItems'] = [];

  // Revenue alerts
  const totalMrr = props.revenue.stripeMrr + props.revenue.revenuecatMrr;
  if (totalMrr === 0) {
    items.push({
      priority: 'high',
      message: `Still at £0 MRR. ${props.funnel.checkoutStarted7d + props.funnel.paywallOpened7d} users reached checkout/paywall this week but none converted. Consider pricing, trust signals, or checkout UX.`,
    });
  }

  // Funnel drop-off
  const checkoutAttempts =
    props.funnel.checkoutStarted7d + props.funnel.paywallOpened7d;
  if (checkoutAttempts > 0 && props.funnel.purchaseCompleted7d === 0) {
    items.push({
      priority: 'high',
      message: `${checkoutAttempts} checkout/paywall views but 0 purchases. 100% checkout abandonment.`,
    });
  }

  // Sentry alerts
  if (props.sentry.newThisWeek > 10) {
    items.push({
      priority: 'medium',
      message: `${props.sentry.newThisWeek} new Sentry issues this week. Review top issues.`,
    });
  }

  const highImpactIssues = props.sentry.topIssues.filter((i) => i.users > 5);
  if (highImpactIssues.length > 0) {
    items.push({
      priority: 'high',
      message: `${highImpactIssues.length} Sentry issue(s) affecting 5+ users: ${highImpactIssues.map((i) => i.id).join(', ')}`,
    });
  }

  // Growth
  if (props.users.ticketsCreated7d === 0) {
    items.push({
      priority: 'medium',
      message:
        'Zero tickets created this week. Check if onboarding flow is working.',
    });
  }

  if (props.content.blogViews7d < 10) {
    items.push({
      priority: 'low',
      message: `Blog had only ${props.content.blogViews7d} views this week. Consider promoting content on social.`,
    });
  }

  return items;
}

// --- Main Handler ---

async function handleRequest(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    logger.info('Starting weekly status email generation');

    // Fetch all data in parallel
    const [stripeData, revenuecat, posthog, sentry, social, dbStats] =
      await Promise.all([
        fetchStripeData(),
        fetchRevenueCatData(),
        fetchPostHogMetrics(),
        fetchSentryData(),
        fetchSocialMetrics(),
        fetchDbStats(),
      ]);

    const weekEnding = new Date().toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const emailData: Omit<
      WeeklyStatusEmailProps,
      'actionItems' | 'weekEnding'
    > = {
      revenue: {
        stripeMrr: stripeData.mrr,
        stripeRevenue7d: stripeData.revenue7d,
        stripeCustomers: stripeData.customers,
        revenuecatMrr: revenuecat.mrr,
        revenuecatActiveUsers: revenuecat.activeUsers,
        revenuecatNewCustomers: revenuecat.newCustomers,
        revenuecatTransactions: revenuecat.transactions,
      },
      users: {
        wau: posthog.wau,
        wauTrend: posthog.wauTrend ?? [],
        newSignups7d: posthog.newSignups7d,
        totalUsers: dbStats.totalUsers,
        totalTickets: dbStats.totalTickets,
        totalChallenges: dbStats.totalChallenges,
        ticketsCreated7d: posthog.ticketsCreated7d,
        ticketsTrend: posthog.ticketsTrend ?? [],
      },
      funnel: {
        paywallOpened7d: posthog.paywallOpened7d,
        checkoutStarted7d: posthog.checkoutStarted7d,
        purchaseCompleted7d: posthog.purchaseCompleted7d,
        purchaseCancelled7d: posthog.purchaseCancelled7d,
      },
      sentry,
      social,
      content: {
        blogViews7d: posthog.blogViews7d,
        blogViewsTrend: posthog.blogViewsTrend ?? [],
        topBlogPosts: posthog.topBlogPosts,
      },
    };

    const actionItems = generateActionItems(emailData);

    const fullProps: WeeklyStatusEmailProps = {
      weekEnding,
      ...emailData,
      actionItems,
    };

    const emailHtml = await render(WeeklyStatusEmail(fullProps));
    const emailText = await render(WeeklyStatusEmail(fullProps), {
      plainText: true,
    });

    const result = await sendEmail({
      to: STATUS_EMAIL_RECIPIENT,
      subject: `PTP Weekly Status — ${weekEnding} | MRR: £${(stripeData.mrr + revenuecat.mrr).toFixed(2)}`,
      html: emailHtml,
      text: emailText,
    });

    if (!result.success) {
      logger.error('Failed to send weekly status email', {
        error: result.error,
      });
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 },
      );
    }

    logger.info('Weekly status email sent', {
      to: STATUS_EMAIL_RECIPIENT,
      messageId: result.messageId,
    });

    return NextResponse.json({
      success: true,
      to: STATUS_EMAIL_RECIPIENT,
      messageId: result.messageId,
      data: fullProps,
    });
  } catch (error) {
    logger.error(
      'Cron weekly-status failed',
      {},
      error instanceof Error ? error : new Error(String(error)),
    );

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

export { handleRequest as GET, handleRequest as POST };
