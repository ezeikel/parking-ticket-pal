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

- [ ] **TikTok Integration**: Add TikTok posting
- [ ] **X/Twitter Integration**: Add Twitter/X posting
- [ ] **YouTube Shorts**: Repurpose Reels for YouTube Shorts
- [ ] **Scheduling**: Post at optimal times per platform
- [ ] **Analytics Dashboard**: Track engagement across platforms

## Commits History

Key commits implementing the video Reels feature:

1. `feat(social): add Instagram Reels support via Remotion worker`
2. `fix(video): make render code Node-compatible`
3. `feat(social): add ElevenLabs audio to Instagram Reels`
4. `feat(video): add audio support to BlogReel composition`
5. `fix(social): constrain hook length to fit voiceover within video`
6. `feat(social): add Facebook Reel posting`
