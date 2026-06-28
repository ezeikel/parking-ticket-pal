# New PTP OAuth Client IDs (chewybytes parking-ticket-pal project, 475497273257)

Created 2026-06-29 during the pcn-ai → chewybytes migration. Consent screen: "Parking Ticket Pal",
External, In production (published), support+dev email hello@chewybytes.com, domains parkingticketpal.com + pcns.ai.

| Purpose | Client ID | Env var(s) | Secret |
|---|---|---|---|
| Web (NextAuth + mobile webClientId) | 475497273257-aig923f48tgtbis32mgv956juefbjk3f.apps.googleusercontent.com | GOOGLE_CLIENT_ID (web prod+dev), EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID (mobile) | yes (GOOGLE_CLIENT_SECRET) |
| iOS prod (bundle com.chewybytes.parkingticketpal.app) | 475497273257-jkbprn0uaojh5qouqqd4i99k9ejsao7k.apps.googleusercontent.com | GOOGLE_IOS_CLIENT_ID (web verify), EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID (mobile prod) | no |
| iOS internal (...app.internal) | 475497273257-pljp9o2j8domlgfg43o860grfombg5ej.apps.googleusercontent.com | EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID (preview build) | no |
| iOS dev (...app.dev) | 475497273257-8cua6sb55kf23rtjl74higgiqjet2hp6.apps.googleusercontent.com | EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID (dev build) | no |
| YouTube (Shorts upload; redirect=oauthplayground) | 475497273257-mcvk5ml8e8n9nfg3av3qbfj5ag8se8dv.apps.googleusercontent.com | YOUTUBE_CLIENT_ID (web prod) | yes (YOUTUBE_CLIENT_SECRET) |

OLD pcn-ai clients (all 1069305445287-*) to retire after verification: web/youtube shared client, iOS client.

Secrets: set by user directly in Vercel dashboard (not piped through agent). GOOGLE_CLIENT_SECRET set for all envs (2026-06-29). YOUTUBE_CLIENT_SECRET + new YOUTUBE_REFRESH_TOKEN still TODO (mint via OAuth Playground against the YouTube client).
