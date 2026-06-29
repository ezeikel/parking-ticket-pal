# ⚠️ TODO: Delete the old personal `pcn-ai` GCP project (after next PTP iOS release)

PTP's Google Cloud resources were migrated from the old personal project **`pcn-ai`**
(project# `1069305445287`, owned by `hello@ezeikel.com`, in the personal `ezeikel.dev` org)
to the company project **`parking-ticket-pal`** (project# `475497273257`, `hello@chewybytes.com`,
`chewybytes.com` org) on **2026-06-29**. See [`gcp-pcn-ai-to-chewybytes.md`](./gcp-pcn-ai-to-chewybytes.md)
for the full runbook and [`new-oauth-client-ids.md`](./new-oauth-client-ids.md) for the new client IDs.

**Everything is already duplicated in the new project** (audited read-only 2026-06-29 — pcn-ai
contains ONLY: Maps APIs + Vision API + YouTube API, one Maps key, one `vision-api-access` SA.
**No Firebase / FCM / push / analytics / Firestore / Cloud Functions** — nothing hidden).

## Do NOT delete `pcn-ai` until ALL of these are done

Deleting too early breaks live users. The order matters:

### Gate 1 — Ship the new iOS build + let it get adopted
- [ ] Run a PTP iOS production build (EAS) and submit to the App Store (App Store ID `6753653055`).
      EAS env vars are already set per-env to the new clients, so the build auto-derives the new
      reverse-client URL scheme — no manual native edit needed.
- [ ] Wait for adoption, or set a minimum-version floor.
- **Why:** the iOS-client-id change rewrites the reverse-client URL scheme in `Info.plist` (NATIVE,
      not OTA-updatable). Until installs move to the new iOS client, they sign in via the OLD pcn-ai
      iOS client (`1069305445287-b0q6oltds…`). The legacy-audience seam keeps them working *while
      pcn-ai still exists* — but the audience must be a real client Google recognises, so the old
      iOS client can't be deleted until those installs are gone.

### Gate 2 — Wire the new YouTube client (currently no working token)
- [ ] Set `YOUTUBE_CLIENT_SECRET` in Vercel (prod) for the new YouTube client `475497273257-mcvk5ml8…`.
- [ ] Mint a new `YOUTUBE_REFRESH_TOKEN` via https://developers.google.com/oauthplayground
      ("use your own OAuth credentials" = the new YouTube client; scope `https://www.googleapis.com/auth/youtube.upload`;
      sign in as the YouTube channel's brand account). Set it in Vercel prod + local.
- [ ] Also paste `GOOGLE_CLIENT_SECRET` into local `apps/web/.env.local` (Vercel already has it).
- **Note:** YouTube posting is already broken (old token dead), so no urgency / nothing to break here.

### Gate 3 — Remove the legacy-audience seam + redeploy
- [ ] Once the new iOS build is adopted, delete `GOOGLE_CLIENT_ID_LEGACY` and
      `GOOGLE_IOS_CLIENT_ID_LEGACY` from Vercel (all envs) and from `apps/web/.env.local`.
- [ ] Optionally simplify `apps/web/app/api/auth/mobile/route.ts` (remove the `*_LEGACY` lines —
      they no-op once the env vars are gone, so this is just cleanup).
- [ ] Redeploy and confirm web + mobile sign-in still work (now purely on the new clients).

### Gate 4 — Final smoke test on the new project
- [ ] Web Google sign-in → works (already verified 2026-06-29 ✓)
- [ ] Mobile Google sign-in (new build) → works
- [ ] ANPR / Cloud Vision → works
- [ ] Maps + Street View → render
- [ ] YouTube Shorts posting → posts (after Gate 2)
- [ ] No Sentry regressions across a full cron cycle.

## THEN delete (in this order, as `hello@ezeikel.com`)
1. Delete the OLD OAuth clients in `pcn-ai` (web/YouTube shared client `1069305445287-jvvmokptd…`,
   iOS client `1069305445287-b0q6oltds…`, web client `1069305445287-1m5mhd9…`) — console only.
2. ```bash
   gcloud iam service-accounts delete vision-api-access@pcn-ai.iam.gserviceaccount.com --project pcn-ai --account hello@ezeikel.com
   gcloud services api-keys delete <Maps-API-Key-uid> --project pcn-ai --account hello@ezeikel.com
   ```
   (The pcn-ai Maps key has a stale `*outsideir35.jobs` referrer — almost certainly unused leftover,
   but confirm before deleting per "investigate before deleting".)
3. Finally delete the project (30-day recoverable):
   ```bash
   gcloud projects delete pcn-ai --account hello@ezeikel.com
   ```

---
_Last audited 2026-06-29. Chunky Crayon's old personal project already deleted; pcn-ai is the last
personal-account project tied to a live app._
