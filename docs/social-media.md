# Social Media Automation

Automatic social media posting for blog content to Instagram, Facebook, and LinkedIn.

## Current Status

### Working

| Platform  | Static Image | Video/Reel | Notes |
|-----------|--------------|------------|-------|
| Instagram | Yes | Yes | Reels with voiceover + background music |
| Facebook  | Yes | Yes | Videos with voiceover + background music |
| LinkedIn  | No | No | Company verification issue blocking API access |

### What Gets Posted

When a blog post is published, the system automatically posts:

1. **Instagram**: Static image (1080x1080) + Reel with audio
2. **Facebook**: Static image (1200x630) + Video with audio
3. **LinkedIn**: Currently disabled due to API verification issues

## Architecture

```
Blog Post Published (via cron or manual trigger)
       |
Main App (social.ts)
       |
   +---------------+----------------+--------------+
   |               |                |              |
Static Image    Gemini Flash    ElevenLabs     ElevenLabs
(OG image)      (hook gen)      (voiceover)    (bg music)
   |               |                |              |
   |               +----------------+--------------+
   |                              |
   |                    Worker API (Remotion)
   |                              |
   |                    Video with Audio
   |                              |
   +------------------------------+
                   |
       +-----------+-----------+
       |                       |
   Instagram API          Facebook API
       |                       |
  +----+----+            +----+----+
  |         |            |         |
Image     Reel        Image     Video
Post      Post        Post      Post
```

## Video Reels

### Generation Flow

1. **Hook Generation**: Gemini Flash creates an engaging hook (max 50 chars, ~4 seconds spoken)
2. **Voiceover**: ElevenLabs TTS narrates the hook using Cedric M voice (UK accent)
3. **Background Music**: ElevenLabs generates 6 seconds of ambient corporate music
4. **Video Rendering**: Remotion worker renders the Reel with:
   - Featured blog image as background (Ken Burns zoom effect)
   - Brand logo + "Parking Ticket Pal"
   - Animated title
   - Hook text as excerpt
   - CTA: "Link in bio" / "Read the full article"

### Video Specs

| Property | Value |
|----------|-------|
| Duration | 6 seconds |
| Frame Rate | 30 fps |
| Resolution | 1080x1920 (9:16 portrait) |
| Voiceover Start | 1.5 seconds in |
| Music Volume | 15% |
| Voiceover Volume | 85% |

### Voice Configuration

- **Voice**: Cedric M - Slow Burn, Expressive Conversational Voice
- **Voice ID**: `P6bTNc9ZMZitpFPNJFbo`
- **Model**: `eleven_turbo_v2_5` (latest, fastest)
- **Style**: UK-accented British male, warm, slow-paced conversational tone

## Environment Variables

### Main App (Vercel + .env.local)

```bash
# Meta API (Instagram + Facebook)
FACEBOOK_PAGE_ID=your-facebook-page-id
FACEBOOK_PAGE_ACCESS_TOKEN=your-page-access-token  # Never expires!
INSTAGRAM_ACCOUNT_ID=your-instagram-business-account-id

# LinkedIn (currently not working)
LINKEDIN_ORGANIZATION_ID=your-organization-id
LINKEDIN_ACCESS_TOKEN=your-access-token

# Worker for video rendering
WORKER_URL=https://worker.parkingticketpal.com
WORKER_SECRET=your-secret

# ElevenLabs for audio
ELEVENLABS_API_KEY=sk_xxx
ELEVENLABS_VOICE_ID=P6bTNc9ZMZitpFPNJFbo

# Base URL for OG image fetching
NEXT_PUBLIC_BASE_URL=https://parkingticketpal.com
```

## Key Files

### Main App

| File | Purpose |
|------|---------|
| `apps/web/app/actions/social.ts` | Main social posting logic, caption generation, audio generation |
| `apps/web/app/api/social/post/route.ts` | API endpoint for triggering social posts |
| `apps/web/app/api/cron/generate-blog/route.ts` | Cron job that triggers blog + social posting |

### Worker (parking-ticket-pal-worker)

| File | Purpose |
|------|---------|
| `src/index.ts` | `/video/render/blog-reel` endpoint |
| `src/video/compositions/BlogReel.tsx` | Remotion composition with audio |
| `src/video/components/` | Animated components (Brand, Title, Excerpt, CTA) |
| `src/video/render.ts` | Remotion rendering logic |

## Caption Generation

Each platform gets AI-generated captions tailored to its audience:

| Platform | Style | Length | Features |
|----------|-------|--------|----------|
| Instagram (image) | Casual, engaging | ~150 words | Emojis, 5-8 hashtags, "Link in bio" |
| Instagram (Reel) | Video-focused | ~100 words | References video, hashtags, "Link in bio" |
| Facebook (image) | Conversational | 200-300 words | Question hook, 2-3 key points, full URL |
| Facebook (video) | Video-focused | ~150 words | References video, includes URL |
| LinkedIn | Professional | 150-200 words | Business focus, thought leadership |

## Testing

```bash
# Test social media posting
pnpm test:social

# Check Meta API token health
pnpm check:tokens

# One-time token setup
pnpm setup:tokens
```

## Known Issues

### LinkedIn Not Working

LinkedIn API requires company/organization verification which is pending. The code exists but posts will fail with authentication errors.

**To fix**: Complete LinkedIn company verification process, then update `LINKEDIN_ACCESS_TOKEN`.

## Future Enhancements

### Planned

- [ ] **LinkedIn Video**: Add video posting once basic LinkedIn posting is fixed
- [ ] **Voice Selection**: Different voices per content type or topic
- [ ] **Music Styles**: Generate music based on blog topic/mood
- [ ] **Longer Videos**: Support 15-30 second Reels for more complex content
- [ ] **Dynamic Duration**: Extend video length based on voiceover duration
- [ ] **A/B Testing**: Compare engagement with/without audio

### Potential

- [ ] **X/Twitter Integration**: Add Twitter/X posting
- [ ] **YouTube Shorts**: Repurpose Reels for YouTube Shorts
- [ ] **Scheduling**: Post at optimal times per platform
- [ ] **Analytics Dashboard**: Track engagement across platforms

> Note: TikTok + LinkedIn posting is **already live via the Buffer API
> bridge** (a temporary path until direct TikTok App Review / LinkedIn
> approval lands). It fires inside the blog-promo `postToSocialMedia`
> flow, gated by `BUFFER_ENABLE_TIKTOK` / `BUFFER_ENABLE_LINKEDIN`. See
> the Buffer-bridge code in `lib/social/buffer.ts`.

## TODO: Content-Pipeline Parity With Chunky Crayon (future)

PTP has three video-posting pipelines today:

1. **Blog-promo** — `/api/social/post` cron (Tue/Thu/Sat 09:30 UTC) posts
   the latest blog as IG/FB reels, with TikTok + LinkedIn via the Buffer
   bridge. Latest blog is fetched at cron time.
2. **Tribunal video** — generation cron (Mon-Fri 10:00 UTC) renders a
   tribunal-case reel; the worker webhook (`completeTribunalVideo` in
   `lib/video-completion.ts`) posts it to IG/FB and **also pushes
   TT + LI via Buffer** (wired alongside the blog-promo Buffer work).
3. **News video** — generation cron (4x/day, 08/11/14/17 UTC) renders
   topical news reels; same webhook pattern (`completeNewsVideo`) posts
   to IG/FB + TT/LI via Buffer.

Chunky Crayon's architecture is still the reference for the deeper
direction (see memory `project-ptp-align-to-cc-arch`): per-content-type
posting crons feeding one shared posting action, with the Buffer bridge
applied per content type. Open items for future PTP work:

1. **Generate most content early-morning, batch-style, like CC.** The
   daily content (blog promo, tribunal reels) could be produced on a
   fixed early cron rather than spread across the day. **News reels are
   the exception** — keep their periodic intra-day scan (08/11/14/17 UTC)
   so timely news articles get picked up through the day, not just once.
2. **Fold the PTP worker into the turborepo** and promote
   `lib/sanitize-caption.ts` + `lib/brand-voice.ts` + `lib/social/buffer.ts`
   into shared packages (today they are duplicated by hand against CC's
   `coloring-core` versions).
3. **Mirror CC's per-platform format rules**: video-only to TikTok;
   LinkedIn can also take static/carousel; FB keeps its longer format
   (PTP's strongest channel — see `ptpPlatformAdapter('facebook')` TODO).

Not scheduled. Pick it up on the next structural PTP social work,
alongside folding the PTP worker
into the turborepo (memory `project-ptp-align-to-cc-arch`).

## TODO: Replace Buffer with direct Threads API (future)

TikTok, LinkedIn, and Threads currently post via the Buffer GraphQL API
(`lib/social/buffer.ts`). It's a TEMPORARY bridge. Threads is the
easiest of the three to migrate to direct because it lives on the same
Meta developer platform as IG/FB — your existing Meta business app
already has Tech Provider Verification (from the IG/FB approval).

**What's needed:**

1. **Meta App Review** for `threads_basic` + `threads_content_publish`
   (+ `threads_manage_replies` for the link-in-reply pattern we use,
   see `metadata.threads.thread` in `lib/social/buffer.ts`). Manual
   review, ~2-4 weeks per permission per Meta's published timelines.
   Screencast of the full publish flow is required.
2. **OAuth grant flow** to mint a long-lived Threads token for PTP's
   Threads account. Tokens are long-lived but expire after ~60 days;
   refresh handling needed — mirror existing `lib/social-tokens.ts`.
3. **Token storage**: `PARKING_TICKET_PAL_THREADS_ACCESS_TOKEN` env var
   + refresh persistence in the existing token-cache pattern.
4. **Direct posters** in `lib/threads-direct.ts` (new):
   - `createThreadsContainer(text, opts)` — text-only or with media URL
   - `waitForThreadsContainer(containerId)` — mirror the existing
     Instagram media-ready polling pattern in `social.ts`
   - `publishThreads(containerId)`
   - `replyToThread(parentId, text)` for the link-in-reply pattern
   - All against `https://graph.threads.net/v1.0/` (NOT `graph.facebook.com`).
5. **Call-site swap** in `app/actions/social.ts` (blog-promo) +
   `lib/video-completion.ts` (tribunal + news): drop the three
   `schedulePostViaBuffer({ platform: 'threads', ... })` calls, replace
   with the direct posters + a follow-up `replyToThread` call carrying
   the URL. Keep the `linkAttachmentUrl` + `replyThread` business logic;
   only the transport changes.
6. **Decommission**: flip `BUFFER_ENABLE_THREADS=false` in PTP Vercel.
   The CC repo can run on its own schedule.

**Cost saving**: ~$6/mo per Buffer channel removed.

**Reference**: [Threads API docs](https://developers.facebook.com/docs/threads/).
Two-step container model (POST `/threads`, then POST `/threads_publish`)
is identical to the Instagram reel-publish flow in `social.ts`, so the
implementation is a fairly mechanical port of the existing IG posters.

**Same-pattern future for TikTok and LinkedIn**: when their direct
approvals land, the dormant `postToLinkedInPage` in `app/actions/social.ts`
gets re-enabled and TikTok migrates from sandbox-drafts to the published
endpoint. Same flip-the-env-var, swap-the-call-site, retire-Buffer
pattern — Threads is the dress rehearsal because it's lowest-risk
(your Meta app is already verified).

## Commits History

Key commits implementing the video Reels feature:

1. `feat(social): add Instagram Reels support via Remotion worker`
2. `fix(video): make render code Node-compatible`
3. `feat(social): add ElevenLabs audio to Instagram Reels`
4. `feat(video): add audio support to BlogReel composition`
5. `fix(social): constrain hook length to fit voiceover within video`
6. `feat(social): add Facebook Reel posting`
