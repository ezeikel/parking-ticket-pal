import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
  Link,
  Hr,
} from '@react-email/components';
import EmailHeader from './EmailHeader';
import EmailFooter from './EmailFooter';

// --- Types ---

type RevenueData = {
  stripeMrr: number;
  stripeRevenue7d: number;
  stripeCustomers: number;
  revenuecatMrr: number;
  revenuecatActiveUsers: number;
  revenuecatNewCustomers: number;
  revenuecatTransactions: number;
};

type UserMetrics = {
  wau: number;
  newSignups7d: number;
  totalUsers: number;
  totalTickets: number;
  totalChallenges: number;
  ticketsCreated7d: number;
};

type FunnelMetrics = {
  paywallOpened7d: number;
  checkoutStarted7d: number;
  purchaseCompleted7d: number;
  purchaseCancelled7d: number;
};

type SentryIssue = {
  id: string;
  title: string;
  culprit: string;
  events: number;
  users: number;
  url: string;
};

type SentryData = {
  unresolvedCount: number;
  newThisWeek: number;
  topIssues: SentryIssue[];
};

type SocialMetrics = {
  facebookFollowers: number | null;
  instagramFollowers: number | null;
};

type ContentMetrics = {
  blogViews7d: number;
  topBlogPosts: { title: string; views: number }[];
};

type ActionItem = {
  priority: 'high' | 'medium' | 'low';
  message: string;
};

export type WeeklyStatusEmailProps = {
  weekEnding: string;
  revenue: RevenueData;
  users: UserMetrics;
  funnel: FunnelMetrics;
  sentry: SentryData;
  social: SocialMetrics;
  content: ContentMetrics;
  actionItems: ActionItem[];
};

// --- Styles ---

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '20px',
  maxWidth: '600px',
  backgroundColor: '#ffffff',
  borderRadius: '8px',
};

const sectionTitle = {
  color: '#222222',
  fontSize: '18px',
  fontWeight: '600' as const,
  margin: '0 0 12px 0',
  lineHeight: '24px',
};

const metricRow = {
  display: 'flex' as const,
  justifyContent: 'space-between' as const,
  padding: '8px 0',
  borderBottom: '1px solid #f0f0f0',
};

const metricLabel = {
  color: '#717171',
  fontSize: '14px',
  margin: '0',
};

const metricValue = {
  color: '#222222',
  fontSize: '14px',
  fontWeight: '600' as const,
  margin: '0',
};

const sectionBox = {
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
  padding: '16px 20px',
  margin: '0 0 24px 0',
};

const issueRow = {
  padding: '8px 0',
  borderBottom: '1px solid #f0f0f0',
};

const issueTitle = {
  color: '#222222',
  fontSize: '13px',
  fontWeight: '500' as const,
  margin: '0 0 2px 0',
  lineHeight: '18px',
};

const issueMeta = {
  color: '#999999',
  fontSize: '12px',
  margin: '0',
};

const actionHigh = {
  backgroundColor: '#fef2f2',
  borderLeft: '4px solid #ef4444',
  padding: '12px 16px',
  margin: '0 0 8px 0',
  borderRadius: '0 6px 6px 0',
};

const actionMedium = {
  backgroundColor: '#fffbeb',
  borderLeft: '4px solid #f59e0b',
  padding: '12px 16px',
  margin: '0 0 8px 0',
  borderRadius: '0 6px 6px 0',
};

const actionLow = {
  backgroundColor: '#f0f9ff',
  borderLeft: '4px solid #3b82f6',
  padding: '12px 16px',
  margin: '0 0 8px 0',
  borderRadius: '0 6px 6px 0',
};

const actionText = {
  color: '#374151',
  fontSize: '14px',
  margin: '0',
  lineHeight: '20px',
};

const hr = {
  borderColor: '#ebebeb',
  margin: '24px 0',
};

// --- Helpers ---

const formatCurrency = (amount: number) => `£${amount.toFixed(2)}`;

const getActionStyle = (priority: 'high' | 'medium' | 'low') => {
  if (priority === 'high') return actionHigh;
  if (priority === 'medium') return actionMedium;
  return actionLow;
};

// --- Component ---

const MetricLine = ({ label, value }: { label: string; value: string }) => (
  <div style={metricRow}>
    <Text style={metricLabel}>{label}</Text>
    <Text style={metricValue}>{value}</Text>
  </div>
);

const WeeklyStatusEmail = ({
  weekEnding,
  revenue,
  users,
  funnel,
  sentry,
  social,
  content,
  actionItems,
}: WeeklyStatusEmailProps) => (
  <Html lang="en">
    <Head />
    <Preview>
      {`PTP Weekly Status — ${weekEnding} | MRR: ${formatCurrency(revenue.stripeMrr + revenue.revenuecatMrr)} | ${users.wau} WAU`}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <EmailHeader
          title="Weekly Status"
          subtitle={`Week ending ${weekEnding}`}
        />

        {/* Action Items */}
        {actionItems.length > 0 && (
          <Section>
            <Text style={sectionTitle}>Action Items</Text>
            {actionItems.map((item, i) => (
              <div key={i} style={getActionStyle(item.priority)}>
                <Text style={actionText}>{item.message}</Text>
              </div>
            ))}
            <Hr style={hr} />
          </Section>
        )}

        {/* Revenue */}
        <Section>
          <Text style={sectionTitle}>Revenue</Text>
          <div style={sectionBox}>
            <MetricLine
              label="MRR (Stripe + RevenueCat)"
              value={formatCurrency(revenue.stripeMrr + revenue.revenuecatMrr)}
            />
            <MetricLine
              label="Web revenue (7d)"
              value={formatCurrency(revenue.stripeRevenue7d)}
            />
            <MetricLine
              label="Web paying customers"
              value={String(revenue.stripeCustomers)}
            />
            <MetricLine
              label="Mobile active users (28d)"
              value={String(revenue.revenuecatActiveUsers)}
            />
            <MetricLine
              label="Mobile new customers (28d)"
              value={String(revenue.revenuecatNewCustomers)}
            />
            <MetricLine
              label="Mobile transactions (28d)"
              value={String(revenue.revenuecatTransactions)}
            />
          </div>
        </Section>

        {/* User Metrics */}
        <Section>
          <Text style={sectionTitle}>Users</Text>
          <div style={sectionBox}>
            <MetricLine label="Weekly active users" value={String(users.wau)} />
            <MetricLine
              label="New signups (7d)"
              value={String(users.newSignups7d)}
            />
            <MetricLine
              label="Tickets created (7d)"
              value={String(users.ticketsCreated7d)}
            />
            <MetricLine label="Total users" value={String(users.totalUsers)} />
            <MetricLine
              label="Total tickets"
              value={String(users.totalTickets)}
            />
            <MetricLine
              label="Total challenges"
              value={String(users.totalChallenges)}
            />
          </div>
        </Section>

        {/* Conversion Funnel */}
        <Section>
          <Text style={sectionTitle}>Conversion Funnel (7d)</Text>
          <div style={sectionBox}>
            <MetricLine
              label="Paywall opened (mobile)"
              value={String(funnel.paywallOpened7d)}
            />
            <MetricLine
              label="Checkout started (web)"
              value={String(funnel.checkoutStarted7d)}
            />
            <MetricLine
              label="Purchase completed"
              value={String(funnel.purchaseCompleted7d)}
            />
            <MetricLine
              label="Purchase cancelled"
              value={String(funnel.purchaseCancelled7d)}
            />
          </div>
        </Section>

        {/* Sentry */}
        <Section>
          <Text style={sectionTitle}>Bugs &amp; Errors</Text>
          <div style={sectionBox}>
            <MetricLine
              label="Unresolved issues"
              value={String(sentry.unresolvedCount)}
            />
            <MetricLine
              label="New this week"
              value={String(sentry.newThisWeek)}
            />
          </div>
          {sentry.topIssues.length > 0 && (
            <div style={{ marginTop: '8px' }}>
              {sentry.topIssues.map((issue) => (
                <div key={issue.id} style={issueRow}>
                  <Link href={issue.url} style={issueTitle}>
                    {issue.title.slice(0, 80)}
                    {issue.title.length > 80 ? '...' : ''}
                  </Link>
                  <Text style={issueMeta}>
                    {issue.events} events · {issue.users} users ·{' '}
                    {issue.culprit}
                  </Text>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Hr style={hr} />

        {/* Social Media */}
        <Section>
          <Text style={sectionTitle}>Social Media</Text>
          <div style={sectionBox}>
            <MetricLine
              label="Facebook followers"
              value={
                social.facebookFollowers !== null
                  ? String(social.facebookFollowers)
                  : 'N/A'
              }
            />
            <MetricLine
              label="Instagram followers"
              value={
                social.instagramFollowers !== null
                  ? String(social.instagramFollowers)
                  : 'N/A'
              }
            />
          </div>
        </Section>

        {/* Content */}
        <Section>
          <Text style={sectionTitle}>Content</Text>
          <div style={sectionBox}>
            <MetricLine
              label="Blog views (7d)"
              value={String(content.blogViews7d)}
            />
          </div>
          {content.topBlogPosts.length > 0 && (
            <div style={{ marginTop: '8px' }}>
              <Text
                style={{
                  ...metricLabel,
                  fontWeight: '500' as const,
                  marginBottom: '8px',
                }}
              >
                Top posts by views:
              </Text>
              {content.topBlogPosts.map((post, i) => (
                <div key={i} style={metricRow}>
                  <Text style={{ ...metricLabel, maxWidth: '400px' }}>
                    {post.title.slice(0, 60)}
                    {post.title.length > 60 ? '...' : ''}
                  </Text>
                  <Text style={metricValue}>{post.views}</Text>
                </div>
              ))}
            </div>
          )}
        </Section>

        <EmailFooter />
      </Container>
    </Body>
  </Html>
);

export default WeeklyStatusEmail;
