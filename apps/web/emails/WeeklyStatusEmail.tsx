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
  Img,
  Row,
  Column,
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
  wauTrend: number[]; // last 4 weeks for sparkline
  newSignups7d: number;
  totalUsers: number;
  totalTickets: number;
  totalChallenges: number;
  ticketsCreated7d: number;
  ticketsTrend: number[]; // last 4 weeks
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
  blogViewsTrend: number[]; // last 4 weeks
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

const containerStyle = {
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
  margin: '24px 0 12px 0',
  lineHeight: '24px',
};

const sectionBox = {
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
  padding: '16px 20px',
  margin: '0 0 8px 0',
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

const hrStyle = {
  borderColor: '#ebebeb',
  margin: '24px 0',
};

const issueTitle = {
  color: '#222222',
  fontSize: '13px',
  fontWeight: '500' as const,
  margin: '0 0 2px 0',
  lineHeight: '18px',
  textDecoration: 'none' as const,
};

const issueMeta = {
  color: '#999999',
  fontSize: '12px',
  margin: '0 0 8px 0',
};

// KPI card styles
const kpiCard = {
  backgroundColor: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '16px',
  textAlign: 'center' as const,
};

const kpiValue = {
  color: '#222222',
  fontSize: '28px',
  fontWeight: '700' as const,
  margin: '0',
  lineHeight: '32px',
};

const kpiLabel = {
  color: '#717171',
  fontSize: '12px',
  fontWeight: '500' as const,
  margin: '4px 0 0 0',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
};

// Table row styles
const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse' as const,
};

const tdLabel = {
  color: '#717171',
  fontSize: '14px',
  padding: '8px 0',
  borderBottom: '1px solid #f0f0f0',
  verticalAlign: 'middle' as const,
};

const tdValue = {
  color: '#222222',
  fontSize: '14px',
  fontWeight: '600' as const,
  padding: '8px 0',
  borderBottom: '1px solid #f0f0f0',
  textAlign: 'right' as const,
  verticalAlign: 'middle' as const,
};

// --- Helpers ---

const formatCurrency = (amount: number) => `£${amount.toFixed(2)}`;

const getActionStyle = (priority: 'high' | 'medium' | 'low') => {
  if (priority === 'high') return actionHigh;
  if (priority === 'medium') return actionMedium;
  return actionLow;
};

/**
 * Generate a QuickChart sparkline URL.
 * Returns an <img> tag with a tiny inline chart.
 */
const buildSparklineUrl = (data: number[], color = '#1ABC9C') => {
  if (!data || data.length === 0) return null;
  const config = {
    type: 'sparkline',
    data: {
      datasets: [{ data, fill: false, borderColor: color, borderWidth: 2 }],
    },
  };
  return `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(config))}&w=120&h=30&bkg=transparent`;
};

// --- Components ---

const MetricRow = ({ label, value }: { label: string; value: string }) => (
  <tr>
    <td style={tdLabel}>{label}</td>
    <td style={tdValue}>{value}</td>
  </tr>
);

const KpiCard = ({
  value,
  label,
  trend,
  color,
}: {
  value: string;
  label: string;
  trend?: number[];
  color?: string;
}) => {
  const sparkUrl = trend ? buildSparklineUrl(trend, color) : null;
  return (
    <Column style={{ width: '50%', paddingRight: '6px', paddingLeft: '6px' }}>
      <div style={kpiCard}>
        <Text style={kpiValue}>{value}</Text>
        <Text style={kpiLabel}>{label}</Text>
        {sparkUrl && (
          <Img
            src={sparkUrl}
            alt={`${label} trend`}
            width={120}
            height={30}
            style={{ margin: '8px auto 0', display: 'block' }}
          />
        )}
      </div>
    </Column>
  );
};

// --- Main Component ---

const WeeklyStatusEmail = ({
  weekEnding,
  revenue,
  users,
  funnel,
  sentry,
  social,
  content,
  actionItems,
}: WeeklyStatusEmailProps) => {
  const totalMrr = revenue.stripeMrr + revenue.revenuecatMrr;
  const funnelTotal = funnel.paywallOpened7d + funnel.checkoutStarted7d;
  const conversionRate =
    funnelTotal > 0
      ? ((funnel.purchaseCompleted7d / funnelTotal) * 100).toFixed(0)
      : '0';

  return (
    <Html lang="en">
      <Head />
      <Preview>
        {`PTP Weekly — ${weekEnding} | MRR: ${formatCurrency(totalMrr)} | ${users.wau} WAU | ${users.ticketsCreated7d} tickets`}
      </Preview>
      <Body style={main}>
        <Container style={containerStyle}>
          <EmailHeader
            title="Weekly Status"
            subtitle={`Week ending ${weekEnding}`}
          />

          {/* KPI Hero Cards */}
          <Section style={{ margin: '0 0 24px 0' }}>
            <Row>
              <KpiCard value={formatCurrency(totalMrr)} label="MRR" />
              <KpiCard
                value={String(users.wau)}
                label="Weekly Active Users"
                trend={users.wauTrend}
                color="#1ABC9C"
              />
            </Row>
            <Row style={{ marginTop: '12px' }}>
              <KpiCard
                value={String(users.ticketsCreated7d)}
                label="Tickets This Week"
                trend={users.ticketsTrend}
                color="#3b82f6"
              />
              <KpiCard
                value={`${conversionRate}%`}
                label="Checkout Conversion"
              />
            </Row>
          </Section>

          {/* Action Items */}
          {actionItems.length > 0 && (
            <Section>
              <Text style={sectionTitle}>Action Items</Text>
              {actionItems.map((item, i) => (
                <div key={i} style={getActionStyle(item.priority)}>
                  <Text style={actionText}>{item.message}</Text>
                </div>
              ))}
            </Section>
          )}

          <Hr style={hrStyle} />

          {/* Conversion Funnel */}
          <Section>
            <Text style={sectionTitle}>Conversion Funnel (7d)</Text>
            <div style={sectionBox}>
              <table style={tableStyle}>
                <tbody>
                  <MetricRow
                    label="Paywall opened (mobile)"
                    value={String(funnel.paywallOpened7d)}
                  />
                  <MetricRow
                    label="Checkout started (web)"
                    value={String(funnel.checkoutStarted7d)}
                  />
                  <MetricRow
                    label="Purchase completed"
                    value={String(funnel.purchaseCompleted7d)}
                  />
                  <MetricRow
                    label="Purchase cancelled"
                    value={String(funnel.purchaseCancelled7d)}
                  />
                </tbody>
              </table>
            </div>
          </Section>

          {/* Revenue */}
          <Section>
            <Text style={sectionTitle}>Revenue</Text>
            <div style={sectionBox}>
              <table style={tableStyle}>
                <tbody>
                  <MetricRow
                    label="MRR (Stripe + RevenueCat)"
                    value={formatCurrency(totalMrr)}
                  />
                  <MetricRow
                    label="Web revenue (7d)"
                    value={formatCurrency(revenue.stripeRevenue7d)}
                  />
                  <MetricRow
                    label="Web paying customers"
                    value={String(revenue.stripeCustomers)}
                  />
                  <MetricRow
                    label="Mobile active users (28d)"
                    value={String(revenue.revenuecatActiveUsers)}
                  />
                  <MetricRow
                    label="Mobile new customers (28d)"
                    value={String(revenue.revenuecatNewCustomers)}
                  />
                </tbody>
              </table>
            </div>
          </Section>

          {/* Users */}
          <Section>
            <Text style={sectionTitle}>Users</Text>
            <div style={sectionBox}>
              <table style={tableStyle}>
                <tbody>
                  <MetricRow
                    label="Weekly active users"
                    value={String(users.wau)}
                  />
                  <MetricRow
                    label="New signups (7d)"
                    value={String(users.newSignups7d)}
                  />
                  <MetricRow
                    label="Tickets created (7d)"
                    value={String(users.ticketsCreated7d)}
                  />
                  <MetricRow
                    label="Total users"
                    value={String(users.totalUsers)}
                  />
                  <MetricRow
                    label="Total tickets"
                    value={String(users.totalTickets)}
                  />
                  <MetricRow
                    label="Total challenges"
                    value={String(users.totalChallenges)}
                  />
                </tbody>
              </table>
            </div>
          </Section>

          {/* Bugs & Errors */}
          <Section>
            <Text style={sectionTitle}>Bugs &amp; Errors</Text>
            <div style={sectionBox}>
              <table style={tableStyle}>
                <tbody>
                  <MetricRow
                    label="Unresolved issues"
                    value={String(sentry.unresolvedCount)}
                  />
                  <MetricRow
                    label="New this week"
                    value={String(sentry.newThisWeek)}
                  />
                </tbody>
              </table>
            </div>
            {sentry.topIssues.length > 0 && (
              <div style={{ marginTop: '8px' }}>
                <Text
                  style={{
                    color: '#717171',
                    fontSize: '13px',
                    fontWeight: '500' as const,
                    margin: '0 0 8px 0',
                  }}
                >
                  Top issues by frequency:
                </Text>
                {sentry.topIssues.map((issue) => (
                  <div
                    key={issue.id}
                    style={{
                      padding: '8px 0',
                      borderBottom: '1px solid #f0f0f0',
                    }}
                  >
                    <Link href={issue.url} style={issueTitle}>
                      {issue.id}: {issue.title.slice(0, 70)}
                      {issue.title.length > 70 ? '...' : ''}
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

          <Hr style={hrStyle} />

          {/* Social & Content side by side */}
          <Section>
            <Row>
              <Column style={{ width: '50%', paddingRight: '8px' }}>
                <Text style={sectionTitle}>Social</Text>
                <div style={sectionBox}>
                  <table style={tableStyle}>
                    <tbody>
                      <MetricRow
                        label="Facebook"
                        value={
                          social.facebookFollowers !== null
                            ? String(social.facebookFollowers)
                            : 'N/A'
                        }
                      />
                      <MetricRow
                        label="Instagram"
                        value={
                          social.instagramFollowers !== null
                            ? String(social.instagramFollowers)
                            : 'N/A'
                        }
                      />
                    </tbody>
                  </table>
                </div>
              </Column>
              <Column style={{ width: '50%', paddingLeft: '8px' }}>
                <Text style={sectionTitle}>Content</Text>
                <div style={sectionBox}>
                  <table style={tableStyle}>
                    <tbody>
                      <MetricRow
                        label="Blog views (7d)"
                        value={String(content.blogViews7d)}
                      />
                    </tbody>
                  </table>
                </div>
              </Column>
            </Row>
          </Section>

          {/* Top Blog Posts */}
          {content.topBlogPosts.length > 0 && (
            <Section>
              <Text
                style={{
                  color: '#717171',
                  fontSize: '13px',
                  fontWeight: '500' as const,
                  margin: '12px 0 8px 0',
                }}
              >
                Top posts by views:
              </Text>
              <div style={sectionBox}>
                <table style={tableStyle}>
                  <tbody>
                    {content.topBlogPosts
                      .filter((p) => !p.title.includes('$$_posthog_breakdown'))
                      .map((post, i) => (
                        <MetricRow
                          key={i}
                          label={
                            post.title.length > 45
                              ? `${post.title.slice(0, 45)}...`
                              : post.title
                          }
                          value={String(post.views)}
                        />
                      ))}
                  </tbody>
                </table>
              </div>
            </Section>
          )}

          <EmailFooter />
        </Container>
      </Body>
    </Html>
  );
};

export default WeeklyStatusEmail;
