# Parking Ticket Pal

A comprehensive web platform that helps users challenge and appeal parking
tickets through automated form filling, AI-generated challenge letters, and
guided appeal processes.

## Overview

Parking Ticket Pal streamlines the parking ticket appeal process by:

- **Automated Challenge Generation**: AI-powered content generation for appeals
- **Form Automation**: Automatic form filling for various parking authorities
- **Document Management**: OCR processing, evidence upload, and PDF generation
- **Multi-Authority Support**: Support for TfL, Lambeth, Lewisham, and other UK
  authorities
- **Subscription Management**: Tiered access with Stripe integration
- **Smart Reminders**: Automated notifications for appeal deadlines
- **Challenge Tracking**: Full lifecycle management from PCN to resolution

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **Payments**: Stripe
- **AI**: OpenAI GPT for content generation
- **Email**: Resend
- **Analytics**: PostHog + Vercel Analytics
- **File Storage**: Vercel Blob
- **PDF Generation**: React-PDF
- **Styling**: Tailwind CSS + shadcn/ui components

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Required API keys (see Environment Variables)

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd parking-ticket-pal-web
```

2. Install dependencies:

```bash
pnpm install
```

3. Set up environment variables (see
   [Environment Variables](#environment-variables) section)

4. Set up the database:

```bash
pnpm prisma migrate dev
pnpm prisma db seed
```

5. Run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

### Environment Variables

Create a `.env.local` file with the following variables:

```bash
# Database
DATABASE_URL="postgresql://..."

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# OpenAI
OPENAI_API_KEY="your-openai-api-key"

# Stripe
STRIPE_SECRET_KEY="your-stripe-secret-key"
STRIPE_PUBLISHABLE_KEY="your-stripe-publishable-key"
STRIPE_WEBHOOK_SECRET="your-webhook-secret"

# Resend (Email)
RESEND_API_KEY="your-resend-api-key"

# PostHog Analytics
NEXT_PUBLIC_POSTHOG_KEY="your-posthog-project-key"
NEXT_PUBLIC_POSTHOG_HOST="https://us.i.posthog.com"

# Vercel Blob Storage
BLOB_READ_WRITE_TOKEN="your-vercel-blob-token"

# Sentry (optional)
SENTRY_AUTH_TOKEN="your-sentry-token"

# Meta API (for social media posting)
FACEBOOK_PAGE_ID="your-facebook-page-id"
FACEBOOK_ACCESS_TOKEN="your-page-access-token"
INSTAGRAM_ACCOUNT_ID="your-instagram-business-account-id"

# Cron job security
CRON_SECRET="your-secure-random-string"
```

## Key Features

### 🤖 AI-Powered Challenge Generation

The platform uses OpenAI to generate contextually appropriate challenge content:

- **Form Field Text**: Concise text for authority website forms
- **Challenge Letters**: Formal letter generation with proper formatting
- **Evidence Integration**: Incorporates uploaded evidence into arguments
- **Authority-Specific**: Tailored content for different parking authorities

### 📋 Form Automation

Automated form filling for major UK parking authorities:

- **TfL (Transport for London)**: TE7, TE9 forms
- **Local Councils**: PE2, PE3 forms (Lambeth, Lewisham, etc.)
- **Smart Field Mapping**: Automatic form field population
- **Evidence Attachment**: Seamless file uploads

### 🤖 Auto-Challenge Automation System

An automation system that submits parking ticket challenges through issuer
portals. Uses a **code generation via PR** approach for adding new issuers.

#### How It Works

**Built-in Issuers** (Lewisham, Horizon, Westminster):
- Automation code runs directly in the Next.js app via Playwright
- No external service needed for supported issuers

**Unsupported Issuers** (Code Generation Flow):
- Worker uses Stagehand + Claude to explore the issuer's website
- Generates TypeScript automation code automatically
- Creates a GitHub PR for human review
- After merge, the issuer becomes a built-in automation

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        AUTO-CHALLENGE FLOW                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  User clicks "Auto-Submit Challenge"                                     │
│           │                                                              │
│           ▼                                                              │
│  ┌─────────────────────┐                                                 │
│  │ Issuer supported?   │──Yes──► Run built-in automation ──► Submit     │
│  │ (isAutomationSupported)                                               │
│  └─────────────────────┘                                                 │
│           │ No                                                           │
│           ▼                                                              │
│  ┌─────────────────────┐                                                 │
│  │ PendingIssuer       │ Check if code generation already in progress   │
│  │ exists?             │                                                 │
│  └─────────────────────┘                                                 │
│           │ No                                                           │
│           ▼                                                              │
│  ┌─────────────────────┐     ┌─────────────────────────────────────────┐│
│  │ Create PendingIssuer│     │           WORKER (Hetzner)              ││
│  │ Call /generate      │────►│                                         ││
│  └─────────────────────┘     │  1. Stagehand explores issuer website   ││
│           │                  │  2. Claude extracts form fields/flow    ││
│           ▼                  │  3. Generate TypeScript automation code ││
│  ┌─────────────────────┐     │  4. Create GitHub PR via gh CLI         ││
│  │ Offer letter        │     │  5. Webhook back with PR URL            ││
│  │ fallback to user    │     └─────────────────────────────────────────┘│
│  └─────────────────────┘                                                 │
│           │                                                              │
│           ▼                                                              │
│  Human reviews PR ──► Merge ──► Issuer now supported as built-in        │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Database Models

| Model | Purpose |
| --- | --- |
| `PendingIssuer` | Tracks code generation requests for new issuers |
| `PendingChallenge` | Queues challenges while waiting for automation |
| `Challenge` | Actual challenge submissions and their status |

**PendingIssuer Status Flow:**

| Status | Description |
| --- | --- |
| `GENERATING` | Worker is analyzing website and generating code |
| `PR_CREATED` | PR created, awaiting human review |
| `PR_MERGED` | PR merged, automation now available |
| `FAILED` | Generation failed |

#### Key Files

```
utils/automation/
├── workerClient.ts    # HTTP client for worker service API
├── shared.ts          # Shared Playwright setup (built-in issuers)
├── challenge.ts       # Challenge function dispatcher
├── verify.ts          # Verify function dispatcher
└── issuers/           # Built-in automation for specific issuers
    ├── index.ts       # Exports all issuers
    ├── lewisham.ts
    ├── horizon.ts
    └── westminster.ts

app/actions/
└── autoChallenge.ts   # Server action for initiating auto-challenges

app/api/webhooks/
└── automation/route.ts # Webhook handler for generation results

components/ticket-detail/
├── ActionsCard.tsx           # Contains "Auto-Submit Challenge" button
└── AutoChallengeDialog.tsx   # Challenge reason selection modal
```

#### Adding Built-in Issuer Support

New issuers can be added either:
1. **Automatically** via the code generation system (creates PR)
2. **Manually** by creating the issuer file

For manual addition:

1. Create issuer file in `utils/automation/issuers/`:

```typescript
// utils/automation/issuers/example.ts
import { ChallengeArgs, CommonPcnArgs, takeScreenShot } from '../shared';
import generateChallengeContent from '@/utils/ai/generateChallengeContent';

export const access = async ({ page, pcnNumber, ticket }: CommonPcnArgs) => {
  await page.goto('https://example.gov.uk/pcn-lookup');
  await page.fill('#pcn', pcnNumber);
  await page.fill('#vrm', ticket.vehicle.registrationNumber);
  await page.click('#search');
  await page.waitForLoadState('networkidle');
};

export const verify = async (args: CommonPcnArgs) => {
  await access(args);
  await takeScreenShot({ page: args.page, ticketId: args.ticket.id });
  return true;
};

export const challenge = async (
  args: ChallengeArgs,
  options?: { dryRun?: boolean; challengeId?: string },
): Promise<ChallengeResult> => {
  // Implementation...
};
```

2. Export from `utils/automation/issuers/index.ts`
3. Add to `CHALLENGE_FUNCTIONS` in `utils/automation/challenge.ts`
4. Add to `VERIFY_FUNCTIONS` in `utils/automation/verify.ts`
5. Add to `AUTOMATIONS` array in `constants/index.tsx`

#### Environment Variables

```bash
# Worker Service
WORKER_URL="http://157.90.168.197:3002"
WORKER_SECRET="your-shared-secret"

# App URL (for webhook callbacks)
NEXT_PUBLIC_APP_URL="https://parkingticketpal.com"
```

#### Production Architecture

Built-in automations run directly in Next.js. Code generation uses a Hetzner worker.

```
┌─────────────────────────────────────────────────────────────────────┐
│                           VERCEL (Web App)                           │
│                                                                      │
│  User clicks "Auto-Submit Challenge"                                 │
│           │                                                          │
│           ▼                                                          │
│  ┌─────────────────┐   Supported?   ┌────────────────────────────┐ │
│  │ autoChallenge   │───────Yes─────►│ Run Playwright in Next.js │ │
│  │ server action   │                └────────────────────────────┘ │
│  └─────────────────┘                                                │
│           │ No (unsupported issuer)                                 │
│           ▼                                                         │
│  ┌─────────────────┐                 ┌─────────────────────────────┐│
│  │ Call /generate  │─── HTTP POST ──►│     HETZNER (Worker)       ││
│  └─────────────────┘                 │                             ││
│           ▲                          │  Stagehand + Claude API     ││
│           │                          │  Explore website            ││
│  ┌─────────────────┐                 │  Generate TypeScript code   ││
│  │ Webhook handler │◄─── Callback ───│  Create PR via gh CLI       ││
│  └─────────────────┘                 │                             ││
│           │                          └─────────────────────────────┘│
│           ▼                                                         │
│  Update PendingIssuer with PR URL                                   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**Worker API Endpoints:**

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/automation/generate` | POST | Generate code for new issuer |
| `/automation/status/:jobId` | GET | Check job status |
| `/automation/cancel/:jobId` | POST | Cancel a running job |

See the
[parking-ticket-pal-worker](https://github.com/ezeikel/parking-ticket-pal-worker)
repository for the worker service implementation.

### 📊 Comprehensive Analytics

Dual analytics setup for complete visibility:

- **PostHog**: Detailed user behavior and conversion tracking
- **Vercel Analytics**: Performance and page view metrics
- **Server + Client Tracking**: Unified API that works everywhere
- **Type-Safe Events**: Predefined event constants for consistency

### 💳 Subscription Management

Flexible pricing tiers with Stripe integration:

- **Standard Tier**: Basic appeal features
- **Premium Tier**: Advanced features, unlimited appeals
- **Usage Tracking**: Challenge credits and limits
- **Automatic Billing**: Seamless subscription management

### 📝 Automated Blog Generation

AI-powered content generation system for SEO optimization:

- **Dynamic Topic Generation**: OpenAI generates content for any UK
  parking/traffic topic
- **AI Image Generation**: OpenAI image generation creates photo-realistic,
  relevant images
- **Vercel Blob Storage**: Persistent content storage across deployments
- **Scheduled Publishing**: Automated cron jobs (Tuesday, Thursday, Saturday)
- **Manual Generation**: On-demand blog post creation via API
- **SEO Optimized**: Engaging titles, structured content, proper meta tags
- **Open Graph Images**: Dynamic social sharing images using Next.js
  ImageResponse

### 📱 Automated Social Media Posting

Automatic social media integration for blog content:

- **Multi-Platform**: Instagram and Facebook posting via Meta API
- **Dynamic Images**: Auto-generated social media images from blog OG images
- **AI Captions**: Platform-specific captions (short for Instagram, detailed for
  Facebook)
- **Automated Scheduling**: Posts automatically after blog generation
- **Never-Expiring Tokens**: Page Access Tokens require no renewal
- **Error Monitoring**: Sentry integration for posting failures

## Development

### Project Structure

```
app/                    # Next.js App Router
├── actions/           # Server actions
├── api/              # API routes
├── (pages)/          # Route groups and pages
components/           # React components
├── ui/              # shadcn/ui components
├── forms/           # Form components
├── buttons/         # Button components
constants/           # Application constants
contexts/           # React contexts
hooks/              # Custom React hooks
lib/                # Shared utilities
prisma/             # Database schema and migrations
utils/              # Utility functions
├── ai/             # AI-related utilities
├── automation/     # Form automation
├── scraping/       # Web scraping utilities
```

### Database Schema

The application uses Prisma with PostgreSQL. Key entities:

- **User**: Authentication and subscription data
- **Ticket**: Parking ticket information
- **Vehicle**: User's registered vehicles
- **Challenge**: Appeal attempts and status
- **Letter**: Generated challenge letters
- **Evidence**: Uploaded supporting documents

Run migrations:

```bash
pnpm prisma migrate dev
pnpm prisma studio  # Database GUI
```

## Analytics Setup

### Dual Analytics Architecture

Our analytics system uses **two specialized utilities** optimized for their
respective environments:

#### Server-Side Tracking (`utils/analytics-server.ts`)

```typescript
import { track } from '@/utils/analytics-server';
import { TRACKING_EVENTS } from '@/constants/events';

// In server actions, API routes, server components
await track(TRACKING_EVENTS.CHALLENGE_CREATED, {
  challengeId: challenge.id,
  challengeType: 'LETTER',
  // userId automatically retrieved from server session
});
```

#### Client-Side Tracking (`utils/analytics-client.ts`)

```typescript
'use client';

import { useAnalytics } from '@/utils/analytics-client';
import { TRACKING_EVENTS } from '@/constants/events';

export default function MyComponent() {
  const { track } = useAnalytics();

  const handleClick = () => {
    track(TRACKING_EVENTS.CTA_CLICKED, {
      buttonId: 'signup',
      location: 'hero',
      // User context automatically from NextAuth session
    });
  };

  return <button onClick={handleClick}>Sign Up</button>;
}
```

### Why Two Files?

**Technical Constraint**: Next.js bundles client components and `posthog-node`
contains Node.js-specific dependencies that can't be bundled for browsers, even
with `serverExternalPackages` configuration.

**Solution**: Separate client and server analytics utilities:

- **Server**: Direct `track()` function with automatic user context
- **Client**: React hook `useAnalytics()` with session management

### PostHog Configuration

**Server-side** tracking uses `posthog-node` with optimized settings for Next.js
server functions:

```typescript
// lib/posthog-server.ts
import { PostHog } from 'posthog-node';

export const posthogServer = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  flushAt: 1, // Immediate sending (server functions are short-lived)
  flushInterval: 0, // No batching delay
});
```

**Client-side** tracking uses `posthog-js` initialized globally:

```typescript
// instrumentation-client.ts
import posthog from 'posthog-js';

posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  defaults: '2025-05-24',
});
```

**Bundle Configuration** prevents server-only packages from client bundles:

```typescript
// next.config.ts
const nextConfig = {
  serverExternalPackages: [
    'posthog-node', // Exclude from client bundle
    // ... other server-only packages
  ],
};
```

### Analytics Best Practices

1. **Use Type-Safe Events**: Always use `TRACKING_EVENTS` constants
2. **Environment-Specific Imports**: Use appropriate analytics utility for
   context
3. **Automatic User Context**: Both utilities automatically handle user
   identification
4. **Error Handling**: Built-in error handling won't crash your app

```typescript
// ✅ Server-side tracking (server actions, API routes)
import { track } from '@/utils/analytics-server';

await track(TRACKING_EVENTS.TICKET_CREATED, {
  ticketId: ticket.id,
  issuer: ticket.issuer,
  initialAmount: ticket.initialAmount,
  // userId automatically retrieved
});

// ✅ Client-side tracking (React components)
import { useAnalytics } from '@/utils/analytics-client';

const { track } = useAnalytics();
track(TRACKING_EVENTS.CTA_CLICKED, {
  buttonId: 'hero-signup',
  // User context from NextAuth session
});
```

### Complete Analytics Coverage

| Environment | PostHog           | Vercel Analytics | User Context       |
| ----------- | ----------------- | ---------------- | ------------------ |
| **Server**  | ✅ `posthog-node` | ✅ Server SDK    | Auto from session  |
| **Client**  | ✅ `posthog-js`   | ✅ Client SDK    | Auto from NextAuth |

## AI Challenge Content Generation

### Shared Content Generation

The `generateChallengeContent` utility handles both form field text and
challenge letters:

```typescript
import { generateChallengeContent } from '@/utils/ai/generateChallengeContent';

// For form automation
const challengeText = await generateChallengeContent({
  pcnNumber: 'PCN123456',
  challengeReason: 'The contravention did not occur',
  additionalDetails: 'I was loading and unloading at the time',
  contentType: 'form-field',
  formFieldPlaceholderText: 'Please provide details...',
  userEvidenceImageUrls: [],
  issuerEvidenceImageUrls: [],
});

// For challenge letters
const letterData = await generateChallengeContent({
  pcnNumber: 'PCN123456',
  challengeReason: 'The contravention did not occur',
  additionalDetails: 'I was loading and unloading at the time',
  contentType: 'letter',
  ticket: ticketData,
  user: userData,
  contraventionCodes: CONTRAVENTION_CODES,
});
```

### Benefits

- **Code Reuse**: Single source of truth for challenge logic
- **Consistency**: Same handling for both forms and letters
- **Extensible**: Easy to add new content types
- **Context-Aware**: Incorporates evidence and ticket details

## Deployment

### Vercel Deployment

The application is optimized for Vercel deployment:

```bash
# Deploy to Vercel
vercel --prod
```

### Environment Setup

1. Configure all environment variables in Vercel dashboard
2. Set up database connection
3. Configure webhook endpoints for Stripe
4. Set up domain and SSL

### Performance Optimization

- **Image Optimization**: Next.js Image component with Vercel optimization
- **Code Splitting**: Automatic route-based splitting
- **Edge Functions**: API routes optimized for edge runtime
- **Caching**: Aggressive caching for static content

## Contributing

1. Follow TypeScript best practices
2. Use existing component patterns
3. Add analytics tracking for new features
4. Update tests for new functionality
5. Follow the established file naming conventions

### Code Style

- **TypeScript**: Exclusive use, no JavaScript files
- **Components**: Named props types, destructured parameters
- **Functions**: Prefer arrow functions
- **Async**: Use `async/await` over `.then()`
- **Icons**: Font Awesome preferred

## Scripts

```bash
# Development
pnpm dev              # Start dev server
pnpm build            # Build for production
pnpm start            # Start production server

# Database
pnpm prisma:migrate   # Run migrations
pnpm prisma:studio    # Open database GUI
pnpm prisma:seed      # Seed database

# Testing
pnpm test             # Run tests
pnpm test:watch       # Run tests in watch mode

# Blog Generation
pnpm generate:blog        # Generate blog post manually
pnpm generate:blog-manual # Test manual blog generation API

# Social Media
pnpm test:social      # Test social media posting
pnpm setup:tokens     # One-time Meta API token setup
pnpm check:tokens     # Check Meta API token health

# Utilities
pnpm lint             # ESLint
pnpm type-check       # TypeScript checking
```

## Blog Automation System

The platform includes a sophisticated automated blog generation system for SEO
optimization and content marketing.

### Features

- **Dynamic Topic Generation**: AI generates high-quality content for any UK
  parking/traffic topic
- **AI Image Generation**: OpenAI image generation creates engaging,
  photo-realistic images relevant to each post
- **Persistent Storage**: Vercel Blob storage ensures content survives
  deployments
- **Automated Scheduling**: Cron jobs run 3 times per week (Tuesday, Thursday,
  Saturday at 9 AM UTC)
- **Manual Generation**: On-demand API endpoint for custom topic generation
- **SEO Optimization**: Structured content with proper meta tags and Open Graph
  images
- **Diverse Authors**: 20 diverse author profiles with varied expertise and
  backgrounds

### Architecture

```
app/actions/blog.ts           # Blog generation server actions
app/api/cron/generate-blog/   # Automated cron job endpoint
app/api/blog/generate/        # Manual generation endpoint
app/blog/[slug]/              # Blog post pages with dynamic OG images
├── opengraph-image.tsx       # Dynamic Open Graph images
├── twitter-image.tsx         # Dynamic Twitter Card images
└── page.tsx                  # Blog post rendering

constants/blog.ts             # Blog topics, tags, and author profiles
constants/prompts.ts          # OpenAI prompts for content generation
vercel.json                   # Cron job configuration
```

### Environment Variables

Add to your `.env.local` for blog generation:

```bash
# Required for blog generation
OPENAI_API_KEY="your-openai-api-key"

# Required for cron job security
CRON_SECRET="your-secure-random-string"

# Vercel Blob Storage (for persistent content)
BLOB_READ_WRITE_TOKEN="your-vercel-blob-token"
```

### Usage

#### Automated Generation

The system automatically generates blog posts 3 times per week via Vercel cron
jobs:

```json
{
  "crons": [
    {
      "path": "/api/cron/generate-blog",
      "schedule": "0 9 * * 2,4,6"
    }
  ]
}
```

#### Manual Generation

Generate posts on-demand via API:

```bash
# Generate a post for a specific topic
curl -X POST https://your-domain.com/api/blog/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -d '{
    "topic": "box junctions",
    "date": "2024-01-15"
  }'

# Generate with current date
curl -X POST https://your-domain.com/api/blog/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -d '{
    "topic": "Westminster parking enforcement"
  }'
```

#### Local Testing

Test the system locally:

```bash
# Test automated generation
pnpm test-blog-gen

# Test manual generation API
pnpm test-manual-blog
```

### Content Quality

Generated blog posts include:

- **Engaging Titles**: AI-optimized titles with viral potential
- **UK-Specific Content**: Proper terminology, laws, and council references
- **Structured Format**: Clear headings, bullet points, and actionable advice
- **SEO Optimization**: Relevant tags from predefined vocabulary
- **Reading Time**: Calculated dynamically, typically 6-8 minutes
- **Custom Images**: AI-generated, photo-realistic images for each post
- **Diverse Authors**: Random selection from 20 diverse professional profiles

### Topic Coverage

The system can generate content for any UK parking/traffic topic, including:

- **Contravention Codes**: PCN codes, violations, and penalties
- **Council Guides**: Authority-specific parking enforcement
- **Forms & Appeals**: PE3, TE9, TE7 form guides and processes
- **Legal Advice**: Bailiffs, Traffic Enforcement Centre, appeals
- **TfL & London**: Bus lanes, ULEZ, congestion charge
- **Seasonal Content**: Christmas parking, holiday restrictions

### Monitoring

Track system performance:

```bash
# Check generation stats
curl https://your-domain.com/api/cron/generate-blog

# View cron job logs in Vercel dashboard
# Monitor blob storage usage
# Track blog page analytics
```

## Meta API Social Media Integration

The platform automatically posts blog content to Instagram and Facebook using
Meta's Graph API.

### 🎯 **Key Features**

✅ **Page Access Tokens NEVER expire** - perfect for automation  
❌ **No renewal automation needed** when using Page Access Tokens  
🔄 **Same token works for both** Facebook and Instagram  
📊 **Automatic monitoring** with weekly health checks

### 🚀 **Quick Setup**

1. **One-time setup** (generates never-expiring tokens):

   ```bash
   pnpm setup:tokens
   ```

2. **Check token health** (weekly monitoring):

   ```bash
   pnpm check:tokens
   ```

3. **Test posting**:
   ```bash
   pnpm test:social
   ```

### 📋 **Environment Variables**

Only 3 variables needed for production:

```bash
# The only token you need (works for both Facebook and Instagram)
FACEBOOK_ACCESS_TOKEN=your_page_access_token  # Never expires!

# IDs to specify which accounts to post to
FACEBOOK_PAGE_ID=your_facebook_page_id
INSTAGRAM_ACCOUNT_ID=your_instagram_business_account_id
```

### 🔧 **Meta App Setup**

1. **Create Meta App** at
   [developers.facebook.com](https://developers.facebook.com)
2. **Add Products**: Instagram Basic Display + Facebook Login
3. **Get Page Access Token** using the setup script
4. **Connect Instagram Business Account** to your Facebook Page

### 🔑 **Token Types & Expiration**

| Token Type             | Expires   | Use Case                 | Renewal Needed |
| ---------------------- | --------- | ------------------------ | -------------- |
| **Page Access Token**  | ♾️ Never  | ✅ Production automation | ❌ No          |
| Long-lived User Token  | 60 days   | 🔧 Setup only            | ✅ Yes         |
| Short-lived User Token | 1-2 hours | 🔧 Setup only            | ✅ Yes         |

### 🔄 **How It Works**

1. **Blog Generation** creates a new post
2. **Social Media Action** automatically triggers
3. **Images Generated** from blog OG images (Instagram: 1080x1080, Facebook:
   1200x630)
4. **AI Captions** created for each platform:
   - Instagram: Short with hashtags + "Link in bio"
   - Facebook: Detailed with full blog URL
5. **Posts Published** to both platforms
6. **Temporary Images** automatically cleaned up

### 📊 **Monitoring & Alerts**

The system automatically monitors token health:

- **Weekly cron job** checks token validity (Mondays at 8 AM)
- **Sentry alerts** for token issues
- **Console warnings** for manual runs
- **API endpoint** for programmatic checks

```bash
# Check token status
curl -H "Authorization: Bearer YOUR_ADMIN_SECRET" \
  https://your-domain.com/api/admin/tokens
```

### 🚨 **Troubleshooting**

**Token Invalid Error**:

```bash
pnpm check:tokens  # See what's wrong
pnpm setup:tokens  # Regenerate if needed
```

**Instagram Posting Fails**:

- Verify Instagram is connected to Facebook Page
- Check Instagram account is Business (not Personal)
- Confirm `INSTAGRAM_ACCOUNT_ID` is correct

**Facebook Posting Fails**:

- Verify you're admin of the Facebook Page
- Check `FACEBOOK_PAGE_ID` is correct
- Ensure page is published (not in draft)

### 🎉 **Benefits**

1. **Set once, forget forever** - Page tokens never expire
2. **No renewal automation** - Unlike other APIs
3. **Unified token** - Same token for Facebook + Instagram
4. **Automatic monitoring** - Get alerted if issues arise
5. **Easy troubleshooting** - Clear scripts and documentation

## Support

For questions or issues, please check the existing documentation or create an
issue in the repository.
