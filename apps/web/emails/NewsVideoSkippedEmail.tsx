import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import EmailHeader from '@/components/emails/EmailHeader';
import EmailFooter from '@/components/emails/EmailFooter';

type Diagnostics = {
  searchPrompt: string;
  rawResultPreview: string;
  articlesFound: {
    url: string;
    source: string;
    headline: string;
    category: string;
  }[];
  filteredOutStale: { headline: string; publishedDate: string }[];
  filteredOutDuplicate: { headline: string; url: string }[];
  filteredOutSemantic: {
    headline: string;
    url: string;
    matchedExisting: string;
  }[];
  skipReason: string | null;
};

type NewsVideoSkippedEmailProps = {
  checkedAt: string;
  diagnostics?: Diagnostics;
};

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

const text = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 0',
};

const infoBox = {
  backgroundColor: '#fefce8',
  border: '1px solid #fde68a',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
};

const infoText = {
  color: '#92400e',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0',
};

const sectionHeader = {
  color: '#111827',
  fontSize: '14px',
  fontWeight: '600' as const,
  margin: '20px 0 8px 0',
};

const codeBlock = {
  backgroundColor: '#f3f4f6',
  border: '1px solid #e5e7eb',
  borderRadius: '6px',
  padding: '12px',
  margin: '8px 0',
  fontSize: '12px',
  lineHeight: '18px',
  color: '#374151',
  whiteSpace: 'pre-wrap' as const,
  wordBreak: 'break-word' as const,
  fontFamily: 'monospace',
};

const articleItem = {
  fontSize: '13px',
  lineHeight: '20px',
  color: '#374151',
  margin: '4px 0',
  paddingLeft: '8px',
  borderLeft: '2px solid #e5e7eb',
};

const badge = {
  display: 'inline-block' as const,
  backgroundColor: '#dbeafe',
  color: '#1e40af',
  fontSize: '11px',
  fontWeight: '600' as const,
  padding: '1px 6px',
  borderRadius: '4px',
  marginRight: '4px',
};

const staleLabel = {
  ...badge,
  backgroundColor: '#fef3c7',
  color: '#92400e',
};

const dupLabel = {
  ...badge,
  backgroundColor: '#fce7f3',
  color: '#9d174d',
};

const semanticLabel = {
  ...badge,
  backgroundColor: '#ede9fe',
  color: '#5b21b6',
};

const timestampText = {
  color: '#6b7280',
  fontSize: '14px',
  margin: '16px 0 0 0',
};

const signature = {
  color: '#6b7280',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '32px 0 0 0',
};

const NewsVideoSkippedEmail = ({
  checkedAt = new Date().toISOString(),
  diagnostics,
}: NewsVideoSkippedEmailProps) => (
  <Html>
    <Head />
    <Preview>
      News Video Pipeline: {diagnostics?.skipReason || 'No new articles found'}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <EmailHeader title="No New Articles Found" />

        <Text style={text}>
          The news video pipeline ran but didn&apos;t find any new articles to
          create a video from.
        </Text>

        {diagnostics?.skipReason && (
          <Section style={infoBox}>
            <Text style={infoText}>
              <strong>Reason:</strong> {diagnostics.skipReason}
            </Text>
          </Section>
        )}

        {!diagnostics?.skipReason && (
          <Section style={infoBox}>
            <Text style={infoText}>
              This is normal — the pipeline deduplicates against previously used
              articles to avoid posting the same story twice. If no fresh UK
              motorist news is available, it will try again at the next
              scheduled run.
            </Text>
          </Section>
        )}

        {diagnostics && (
          <>
            {/* Articles found */}
            <Text style={sectionHeader}>
              Articles Found ({diagnostics.articlesFound.length})
            </Text>
            {diagnostics.articlesFound.length === 0 ? (
              <Text style={{ ...text, fontSize: '13px', color: '#6b7280' }}>
                Perplexity returned no articles.
              </Text>
            ) : (
              diagnostics.articlesFound.map((a) => (
                <Section key={a.url} style={articleItem}>
                  <Text style={{ margin: '2px 0', fontSize: '13px' }}>
                    <span style={badge}>{a.category}</span>
                    <strong>{a.source}</strong>: {a.headline}
                  </Text>
                </Section>
              ))
            )}

            {/* Filtered out — stale */}
            {diagnostics.filteredOutStale.length > 0 && (
              <>
                <Text style={sectionHeader}>
                  Filtered Out — Wrong Year (
                  {diagnostics.filteredOutStale.length})
                </Text>
                {diagnostics.filteredOutStale.map((a) => (
                  <Section key={a.headline} style={articleItem}>
                    <Text style={{ margin: '2px 0', fontSize: '13px' }}>
                      <span style={staleLabel}>{a.publishedDate}</span>
                      {a.headline}
                    </Text>
                  </Section>
                ))}
              </>
            )}

            {/* Filtered out — exact URL duplicate */}
            {diagnostics.filteredOutDuplicate.length > 0 && (
              <>
                <Text style={sectionHeader}>
                  Filtered Out — Exact URL Match (
                  {diagnostics.filteredOutDuplicate.length})
                </Text>
                {diagnostics.filteredOutDuplicate.map((a) => (
                  <Section key={a.url} style={articleItem}>
                    <Text style={{ margin: '2px 0', fontSize: '13px' }}>
                      <span style={dupLabel}>URL MATCH</span>
                      {a.headline}
                    </Text>
                  </Section>
                ))}
              </>
            )}

            {/* Filtered out — same story from different source */}
            {diagnostics.filteredOutSemantic.length > 0 && (
              <>
                <Text style={sectionHeader}>
                  Filtered Out — Same Story, Different Source (
                  {diagnostics.filteredOutSemantic.length})
                </Text>
                {diagnostics.filteredOutSemantic.map((a) => (
                  <Section key={a.url} style={articleItem}>
                    <Text style={{ margin: '2px 0', fontSize: '13px' }}>
                      <span style={semanticLabel}>SAME STORY</span>
                      {a.headline}
                    </Text>
                    <Text
                      style={{
                        margin: '2px 0 2px 8px',
                        fontSize: '12px',
                        color: '#6b7280',
                      }}
                    >
                      Matches: &ldquo;{a.matchedExisting}&rdquo;
                    </Text>
                  </Section>
                ))}
              </>
            )}

            {/* Raw Perplexity output preview */}
            <Text style={sectionHeader}>Perplexity Raw Output (preview)</Text>
            <Text style={codeBlock}>
              {diagnostics.rawResultPreview.slice(0, 1500) || '(empty)'}
              {diagnostics.rawResultPreview.length > 1500 ? '...' : ''}
            </Text>
          </>
        )}

        <Text style={timestampText}>
          Checked at:{' '}
          {new Date(checkedAt).toLocaleString('en-GB', {
            timeZone: 'Europe/London',
          })}
        </Text>

        <Text style={signature}>
          Best regards,
          <br />
          The Parking Ticket Pal Team
        </Text>

        <EmailFooter />
      </Container>
    </Body>
  </Html>
);

export default NewsVideoSkippedEmail;
