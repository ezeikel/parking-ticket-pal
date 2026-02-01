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
import EmailHeader from '@/components/emails/EmailHeader';
import EmailFooter from '@/components/emails/EmailFooter';
import EmailButton from '@/components/emails/EmailButton';

type PlatformCaption = {
  platform: string;
  caption: string;
  autoPosted: boolean;
  assetType: 'image' | 'video' | 'both';
  // For YouTube Shorts which has title + description
  title?: string;
  description?: string;
};

type SocialDigestEmailProps = {
  blogTitle: string;
  blogUrl: string;
  imageUrl: string;
  videoUrl: string;
  captions: PlatformCaption[];
};

// Styles
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

const assetSection = {
  backgroundColor: '#f0fdf4',
  border: '1px solid #86efac',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
};

const assetTitle = {
  color: '#166534',
  fontSize: '14px',
  fontWeight: '700',
  margin: '0 0 12px 0',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
};

const assetRow = {
  display: 'flex',
  alignItems: 'center',
  margin: '8px 0',
};

const assetLabel = {
  color: '#374151',
  fontSize: '14px',
  fontWeight: '600',
  marginRight: '8px',
};

const assetLink = {
  color: '#1ABC9C',
  fontSize: '14px',
  textDecoration: 'underline',
};

const platformSection = {
  marginTop: '32px',
};

const platformCard = {
  backgroundColor: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '20px',
  marginBottom: '16px',
};

const platformHeader = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: '12px',
};

const platformName = {
  color: '#1f2937',
  fontSize: '18px',
  fontWeight: '700',
  margin: '0',
};

const statusBadge = {
  fontSize: '12px',
  fontWeight: '600',
  padding: '4px 10px',
  borderRadius: '9999px',
};

const autoPostedBadge = {
  ...statusBadge,
  backgroundColor: '#dcfce7',
  color: '#166534',
};

const manualBadge = {
  ...statusBadge,
  backgroundColor: '#fef3c7',
  color: '#92400e',
};

const assetTypeBadge = {
  fontSize: '11px',
  color: '#6b7280',
  marginBottom: '8px',
};

const captionBox = {
  backgroundColor: '#ffffff',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  padding: '12px',
  marginTop: '8px',
};

const captionLabel = {
  color: '#6b7280',
  fontSize: '12px',
  fontWeight: '600',
  margin: '0 0 8px 0',
  textTransform: 'uppercase' as const,
};

const captionText = {
  color: '#374151',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0',
  whiteSpace: 'pre-wrap' as const,
};

const divider = {
  borderTop: '1px solid #e5e7eb',
  margin: '32px 0',
};

const signature = {
  color: '#6b7280',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '32px 0 0 0',
};

const getPlatformEmoji = (platform: string): string => {
  const emojis: Record<string, string> = {
    instagram: '📸',
    instagramReel: '🎬',
    facebook: '👥',
    facebookReel: '🎬',
    linkedin: '💼',
    tiktok: '🎵',
    youtubeShorts: '▶️',
    threads: '🧵',
  };
  return emojis[platform] || '📱';
};

const getPlatformDisplayName = (platform: string): string => {
  const names: Record<string, string> = {
    instagram: 'Instagram',
    instagramReel: 'Instagram Reel',
    facebook: 'Facebook',
    facebookReel: 'Facebook Reel',
    linkedin: 'LinkedIn',
    tiktok: 'TikTok',
    youtubeShorts: 'YouTube Shorts',
    threads: 'Threads',
  };
  return names[platform] || platform;
};

const getAssetTypeLabel = (assetType: 'image' | 'video' | 'both'): string => {
  const labels: Record<string, string> = {
    image: 'Image post',
    video: 'Video/Reel',
    both: 'Image + Video',
  };
  return labels[assetType];
};

const SocialDigestEmail = ({
  blogTitle = 'How to Appeal a Parking Ticket in the UK',
  blogUrl = 'https://parkingticketpal.com/blog/how-to-appeal-parking-ticket',
  imageUrl = 'https://example.com/image.jpg',
  videoUrl = 'https://example.com/video.mp4',
  captions = [
    {
      platform: 'instagram',
      caption: 'Got a parking ticket? Here\'s what you need to know...\n\n#ParkingTicket #UKDriving',
      autoPosted: true,
      assetType: 'both',
    },
    {
      platform: 'tiktok',
      caption: 'POV: You just got a parking ticket and don\'t know what to do 😱\n\n#parkingticket #uk #fyp',
      autoPosted: false,
      assetType: 'video',
    },
  ],
}: SocialDigestEmailProps) => (
  <Html>
    <Head />
    <Preview>Social Media Assets Ready: {blogTitle}</Preview>
    <Body style={main}>
      <Container style={container}>
        <EmailHeader title="Social Media Assets Ready" />

        <Text style={text}>
          Your social media posts for <strong>&quot;{blogTitle}&quot;</strong> are ready!
        </Text>

        <Section style={assetSection}>
          <Text style={assetTitle}>📦 Download Assets</Text>
          <div style={assetRow}>
            <span style={assetLabel}>📸 Image:</span>
            <Link href={imageUrl} style={assetLink}>
              Download Image (1080x1080)
            </Link>
          </div>
          <div style={assetRow}>
            <span style={assetLabel}>🎬 Video:</span>
            <Link href={videoUrl} style={assetLink}>
              Download Video (1080x1920)
            </Link>
          </div>
        </Section>

        <Hr style={divider} />

        <Section style={platformSection}>
          <Text style={{ ...text, fontWeight: '600', marginBottom: '20px' }}>
            Platform Captions
          </Text>

          {captions.map((item, index) => (
            <div key={index} style={platformCard}>
              <div style={platformHeader}>
                <Text style={platformName}>
                  {getPlatformEmoji(item.platform)}{' '}
                  {getPlatformDisplayName(item.platform)}
                </Text>
                <span style={item.autoPosted ? autoPostedBadge : manualBadge}>
                  {item.autoPosted ? '✓ Auto-posted' : '📋 Manual'}
                </span>
              </div>
              <Text style={assetTypeBadge}>
                {getAssetTypeLabel(item.assetType)}
              </Text>

              {item.title && (
                <div style={captionBox}>
                  <Text style={captionLabel}>Title</Text>
                  <Text style={captionText}>{item.title}</Text>
                </div>
              )}

              <div style={captionBox}>
                <Text style={captionLabel}>
                  {item.description ? 'Description' : 'Caption'}
                </Text>
                <Text style={captionText}>
                  {item.description || item.caption}
                </Text>
              </div>
            </div>
          ))}
        </Section>

        <Hr style={divider} />

        <EmailButton href={blogUrl}>View Blog Post</EmailButton>

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

export default SocialDigestEmail;
