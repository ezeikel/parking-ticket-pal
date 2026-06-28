I'll write this runbook directly from the recon provided. No tool calls are needed; the data is complete and the task is to synthesize the definitive plan. Let me produce it.

---

# PTP GCP Migration Runbook: `pcn-ai` (ezeikel.dev) → `parking-ticket-pal` (chewybytes)

**Strategy: recreate-and-swap** (cross-org `gcloud projects move` is blocked by domain-restricted-sharing on both orgs). Every credential is recreated in the NEW project, swapped in via env vars, verified live, and only then is the OLD credential retired. The OLD `pcn-ai` project is **never deleted** until YouTube re-consent + iOS rebuild ship.

**Project facts**
- OLD: `pcn-ai`, project# `1069305445287`, owner `hello@ezeikel.com`
- NEW: `parking-ticket-pal`, project# `475497273257`, owner `hello@chewybytes.com` (console authuser=1)
- Web Vercel project: `parking-ticket-pal-web` (`prj_v1lR9bEvUWmvW5o93ZXegVTfaiCP`, team `team_djQoDOSEHQB3fbm6aZ4QUJHQ`, root `apps/web`)
- Mobile: Expo/EAS (CNG prebuild-only; no Vercel)
- Local env files: `apps/web/.env.local`, `apps/mobile/.env.local`

**The seven credential families to move**
1. Vision API service account (ANPR) → `GOOGLE_APPLICATION_CREDENTIALS_BASE64`
2. Gemini API key → `GOOGLE_GENERATIVE_AI_API_KEY`
3. Maps JS key (web+mobile, public) → `NEXT_PUBLIC_GOOGLE_MAPS_JS_API_KEY` / `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`
4. Street View Static key → `GOOGLE_STREET_VIEW_API_KEY`
5. NextAuth Google web OAuth client → `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
6. iOS Google OAuth client → `GOOGLE_IOS_CLIENT_ID` (server verify) + `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` / `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (mobile)
7. YouTube OAuth client + refresh token → `YOUTUBE_CLIENT_ID` / `YOUTUBE_CLIENT_SECRET` / `YOUTUBE_REFRESH_TOKEN`

Note: the NEW project already has its own Street View, Gemini, and Maps Platform keys (created independently). We will **reuse those NEW-project keys** rather than re-mint, but they must be **restriction-hardened** before going live (the Gemini key is currently fully unrestricted — highest risk). The Vision SA, all OAuth clients, and the YouTube refresh token do **not** exist in NEW yet and must be created.

---

## SECTION 1 — Exact mutation list (ordered)

Phase A enables APIs + creates new credentials (no production impact). Phase B hardens. Phase C swaps env vars (web, then mobile). Phase D re-consents YouTube + ships iOS. Phase E retires OLD.

All `gcloud` commands assume `--project parking-ticket-pal` for NEW and `--project pcn-ai` for OLD, run under the matching authed account. Set the active account explicitly per command with `--account` to avoid cross-org mistakes.

### PHASE A — Enable APIs + create NEW credentials (zero production impact)

---

**A1. [CLI] Enable required APIs on the NEW project**

```bash
gcloud services enable \
  vision.googleapis.com \
  generativelanguage.googleapis.com \
  maps-backend.googleapis.com \
  maps-embed-backend.googleapis.com \
  static-maps-backend.googleapis.com \
  street-view-image-backend.googleapis.com \
  youtube.googleapis.com \
  --project parking-ticket-pal --account hello@chewybytes.com
```

- **Enables:** nothing swaps yet; this is a prerequisite so the new keys/SA/clients have targets to call.
- **Verify:** `gcloud services list --enabled --project parking-ticket-pal --account hello@chewybytes.com | grep -E 'vision|generativelanguage|maps|street|youtube'` — confirm all seven present.

---

**A2. [CLI] Create the Vision API service account in NEW + grant role + mint key**

```bash
# create SA
gcloud iam service-accounts create vision-api-access \
  --display-name "Vision API access (PTP)" \
  --project parking-ticket-pal --account hello@chewybytes.com

# Vision needs no project IAM role for the API itself beyond being able to call it with a key;
# the SA uses a JSON key for ADC. Grant serviceusage consumer so quota/billing attributes correctly:
gcloud projects add-iam-policy-binding parking-ticket-pal \
  --member "serviceAccount:vision-api-access@parking-ticket-pal.iam.gserviceaccount.com" \
  --role "roles/serviceusage.serviceUsageConsumer" \
  --account hello@chewybytes.com

# mint a JSON key
gcloud iam service-accounts keys create /tmp/ptp-vision-new.json \
  --iam-account vision-api-access@parking-ticket-pal.iam.gserviceaccount.com \
  --project parking-ticket-pal --account hello@chewybytes.com

# base64-encode for the env var (macOS: -i input file, no line wrap)
base64 -i /tmp/ptp-vision-new.json | tr -d '\n' > /tmp/ptp-vision-new.b64
```

- **Enables swap of:** `GOOGLE_APPLICATION_CREDENTIALS_BASE64` (decoded `project_id` will be `parking-ticket-pal`, `client_email` `vision-api-access@parking-ticket-pal.iam.gserviceaccount.com`).
- **Verify:** decode and confirm project: `base64 -D -i /tmp/ptp-vision-new.b64 | grep project_id` shows `parking-ticket-pal`. Defer live Vision verification to C2 (after env swap on a preview deploy).
- **Security:** treat `/tmp/ptp-vision-new.json` + `.b64` as secrets; delete after the env var is set (`rm /tmp/ptp-vision-new.json /tmp/ptp-vision-new.b64`).

---

**A3. [CONSOLE] Create the NextAuth Google **Web** OAuth client in NEW**

OAuth client creation is console-only. In Chrome, authuser=1 (`hello@chewybytes.com`), project `parking-ticket-pal`: APIs & Services → Credentials → Create Credentials → OAuth client ID → **Web application**.

- Name: `PTP Web (NextAuth)`.
- Authorized JavaScript origins: production web origin (e.g. `https://www.parkingticketpal.com` and any apex/`https://parkingticketpal.com`), plus `http://localhost:3000` for local.
- Authorized redirect URIs: `https://<prod-domain>/api/auth/callback/google` and `http://localhost:3000/api/auth/callback/google`. Add the Vercel preview pattern only if Google sign-in is used on previews (recon says PREVIEW has no Google vars, so **omit preview** — keeps the client minimal).
- **OAuth consent screen** for the NEW project must exist first: configure it (External, app name "Parking Ticket Pal", support email, the brand Google account as a **Test user** if the app stays in Testing). The same consent screen is shared by the iOS + YouTube clients below.
- **Enables swap of:** `GOOGLE_CLIENT_ID` (new `475497273257-…`) + `GOOGLE_CLIENT_SECRET` (new web secret).
- **Verify:** client appears in Credentials list; copy Client ID + secret into the secrets vault for C-phase. Live verify in C1 via a preview deploy sign-in.

---

**A4. [CONSOLE] Create the **iOS** Google OAuth client(s) in NEW**

Create Credentials → OAuth client ID → **iOS**. The mobile app is CNG with **three** env-derived bundle ids (`app.config.ts`): prod `com.chewybytes.parkingticketpal.app`, preview `…​.internal`, dev `…​.dev`. iOS OAuth clients are bundle-id-scoped, so create one iOS client per bundle id you intend to ship sign-in on:

- `PTP iOS (prod)` → bundle id `com.chewybytes.parkingticketpal.app`
- `PTP iOS (preview/internal)` → `com.chewybytes.parkingticketpal.internal`
- `PTP iOS (dev)` → `com.chewybytes.parkingticketpal.dev`

(Minimum: the prod one. Create dev+preview too so internal/dev builds keep working under the new project.)

- **Enables swap of:** `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` (mobile, the prod-bundle client) and the server-side `GOOGLE_IOS_CLIENT_ID` (used to verify mobile ID tokens). `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` should be set to the **A3 web client ID** (the `@react-native-google-signin` `webClientId` must be a Web-type client, which is why A3's client is reused here).
- **Verify:** clients appear in Credentials; note each client ID. The reversed-client-id scheme is auto-derived in `app.config.ts` at prebuild — no console download needed (no GoogleService-Info.plist in this app).

---

**A5. [CONSOLE] Create the **YouTube** OAuth client in NEW (Web type, for refresh-token minting)**

Create Credentials → OAuth client ID → **Web application**.

- Name: `PTP YouTube Shorts poster`.
- Authorized redirect URIs: add `https://developers.google.com/oauthplayground` (so the user can mint the refresh token via OAuth Playground in D1).
- Ensure **YouTube Data API v3** is enabled (done in A1) and the consent screen lists scope `https://www.googleapis.com/auth/youtube.upload`, with the brand/channel Google account added as a **Test user** (or publish the app).
- **Enables swap of:** `YOUTUBE_CLIENT_ID` + `YOUTUBE_CLIENT_SECRET`. (`YOUTUBE_REFRESH_TOKEN` is minted later in D1 — agent cannot do it.)
- **Verify:** client appears; redirect URI exactly matches the Playground URL.

---

### PHASE B — Harden the NEW-project API keys (do BEFORE they serve production)

The NEW project already has three raw keys (Street View, Gemini, Maps Platform). We will reuse them, but per recon two have no application restriction and the **Gemini key is fully unrestricted**. Harden first.

---

**B1. [CLI] Lock the Gemini key to the Generative Language API**

```bash
gcloud services api-keys update <GEMINI_KEY_RESOURCE_ID> \
  --api-target=service=generativelanguage.googleapis.com \
  --project parking-ticket-pal --account hello@chewybytes.com
```

(Resource id = the key uid `12b854c0-f8ca-4826-9b1b-0112f358c532`; resolve full resource name via `gcloud services api-keys list --project parking-ticket-pal`.) Gemini is called **server-side only**, so an API-target restriction is the right control (no referrer/app restriction possible for a server key).

- **Enables safe use of:** `GOOGLE_GENERATIVE_AI_API_KEY` (value already `AIzaSyB3JPA5ve…` = the NEW key — recon shows the env var ALREADY holds the NEW project's Gemini key prefix). **No env value change needed for Gemini**; only hardening.
- **Verify:** `gcloud services api-keys get-key-string … ` unchanged; `gcloud services api-keys describe <id>` shows `apiTargets: generativelanguage`.

---

**B2. [CLI] Confirm Street View + Maps Platform key restrictions (already API-target-locked)**

```bash
gcloud services api-keys describe <STREETVIEW_KEY_ID> --project parking-ticket-pal --account hello@chewybytes.com
gcloud services api-keys describe <MAPS_KEY_ID>      --project parking-ticket-pal --account hello@chewybytes.com
```

- Street View key (`3be1285d…`, `AIzaSyCORjlT7B…`) is already locked to `street-view-image-backend` — server-side use is fine as-is.
- Maps Platform key (`3704de65…`, `AIzaSyBpxHk9rV…`) is locked to 31 Maps targets but has **no referrer restriction**. This is the **public** Maps JS key (`NEXT_PUBLIC_…` / `EXPO_PUBLIC_…`). Add an HTTP-referrer restriction for the web origins. Mobile (Expo) cannot use referrer restriction, so if web+mobile must share one key, leave referrer off OR split into two keys. **Recommendation:** create a separate Maps key for mobile with an iOS-app restriction, and referrer-restrict the web key.

Optional split (recommended, [CLI]):
```bash
# new mobile-only Maps key, restricted to the iOS bundle ids
gcloud services api-keys create \
  --display-name "Maps Platform API Key (iOS)" \
  --allowed-bundle-ids=com.chewybytes.parkingticketpal.app \
  --allowed-bundle-ids=com.chewybytes.parkingticketpal.internal \
  --allowed-bundle-ids=com.chewybytes.parkingticketpal.dev \
  --api-target=service=maps-ios-backend.googleapis.com \
  --api-target=service=maps-backend.googleapis.com \
  --api-target=service=places-backend.googleapis.com \
  --project parking-ticket-pal --account hello@chewybytes.com
```

- **Enables swap of:** `NEXT_PUBLIC_GOOGLE_MAPS_JS_API_KEY` (web) + `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` (mobile). Recon shows these env vars **already hold the NEW key** (`AIzaSyBpxHk9rV…`), so the **value may not change** — but if you split web/mobile keys, mobile gets the new iOS-restricted key string. Web key gets referrer added (see B3).

---

**B3. [CONSOLE or CLI] Add HTTP-referrer restriction to the web Maps key**

```bash
gcloud services api-keys update <MAPS_KEY_ID> \
  --allowed-referrers="https://*.parkingticketpal.com/*,https://parkingticketpal.com/*,http://localhost:3000/*" \
  --project parking-ticket-pal --account hello@chewybytes.com
```

- **Verify:** load a web page that renders interactive Street View on a `*.parkingticketpal.com` preview/prod and confirm the map renders with no `RefererNotAllowedMapError` in console. Keep `localhost` for dev.

---

### PHASE C — Swap env vars (web first, fully verifiable; then mobile)

Env writes: edit `apps/web/.env.local` locally; for Vercel use the **API PATCH** path (the recon flags `vercel env add` via stdin as unreliable). Apply to **all targets the var currently exists in** (per the matrix). **Add new values as new env entries or overwrite, then redeploy** — do not delete the OLD project's credentials in this phase.

Order within C: do **PREVIEW first** for each var (where it exists), deploy a preview, verify, then promote the same value to PRODUCTION. For vars absent from preview (Google web OAuth, YouTube), verify on a one-off branch preview by temporarily adding them, or accept verifying directly on a low-traffic prod deploy at an off-peak window.

---

**C1. [CLI] Swap NextAuth Google web client → `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`**

- Targets: production + development (NOT preview, per matrix). Local: `apps/web/.env.local`.
- New values: from A3.
- **Fixes the known DRIFT:** prod `GOOGLE_CLIENT_SECRET` currently equals the YouTube secret. Set prod `GOOGLE_CLIENT_SECRET` to the **new web** client's secret (correct), not the YouTube secret.
- **Verify:** deploy; on the prod (or temporary preview) domain, sign in with Google → NextAuth callback succeeds, session created. Check Sentry for `OAuthCallbackError`.
- Local: update `apps/web/.env.local` `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`, `pnpm dev`, sign in at `localhost:3000`.

---

**C2. [CLI] Swap Vision SA → `GOOGLE_APPLICATION_CREDENTIALS_BASE64`**

- Targets: production, preview, development, local (`apps/web/.env.local`).
- New value: `/tmp/ptp-vision-new.b64` from A2.
- **Verify (preview first):** set on preview, deploy a branch preview, run an ANPR flow (upload a plate image) → Vision returns text, no `PERMISSION_DENIED`/`project not found`. Then promote to prod. Watch Sentry for Vision errors.
- Then `rm /tmp/ptp-vision-new.json /tmp/ptp-vision-new.b64`.

---

**C3. [CLI] Confirm/refresh Gemini, Street View, Maps keys**

- `GOOGLE_GENERATIVE_AI_API_KEY`: value already NEW (`AIzaSyB3JPA5ve…`); after B1 hardening, **verify** an AI Judge/image-eval/blog-gen call succeeds (no `API_KEY_SERVICE_BLOCKED`).
- `GOOGLE_STREET_VIEW_API_KEY`: value already NEW (`AIzaSyCORjlT7B…`); verify a server-side Street View Static fetch returns an image.
- `NEXT_PUBLIC_GOOGLE_MAPS_JS_API_KEY`: value already NEW; after B3 referrer lock, verify interactive map/Street View renders.

(If recon's "already NEW" is wrong for any of these and the live value still resolves to `pcn-ai` quota, replace with the NEW key string and redeploy — but the prefixes in the recon match the NEW project's keys, so expect no value change, only hardening + verification.)

---

**C4. [CLI] Swap server-side iOS token-verifier → `GOOGLE_IOS_CLIENT_ID`**

- Targets: production, preview, development, local.
- New value: the **prod** iOS client ID from A4.
- **Caveat:** the server uses `GOOGLE_IOS_CLIENT_ID` to verify the `aud` of ID tokens from the mobile app. **Installed apps still send tokens minted by the OLD iOS client until the new mobile build ships.** So the verifier must accept **both** old and new iOS client IDs during the transition. Two options:
  - (a) Make the verifier accept an **array** of audiences (old + new) — requires a small code change in the mobile-sign-in verify path. Preferred (zero downtime for existing installs).
  - (b) Keep `GOOGLE_IOS_CLIENT_ID` = OLD until the new build is the floor version, then flip. Simpler but breaks new-build sign-in until flip.
- **Recommendation:** (a). Add a `GOOGLE_IOS_CLIENT_ID_LEGACY` env (= OLD id) and verify `aud ∈ {new, legacy}`. Remove legacy in Phase E after the new build is forced.
- **Verify:** existing-install sign-in still works (token aud = OLD, accepted via legacy); a dev build using the NEW client (C5) signs in (aud = NEW).

---

**C5. [HUMAN/CLI] Swap mobile sign-in client ids → `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` / `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` + Maps**

No source edit needed (`app.config.ts` + `contexts/auth.tsx` already read env vars). Steps:

1. **[CLI]** Edit `apps/mobile/.env.local`: set `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` = new prod iOS client (A4), `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` = new web client (A3). If you split Maps, set `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` = new iOS Maps key (B2).
2. **[CLI]** Update the same vars in **EAS Environment Variables** for `development` / `preview` / `production` (these are NOT in `eas.json`; they live server-side in EAS). 
3. **[HUMAN]** Re-prebuild + rebuild — this regenerates `ios/PTPDev/Info.plist` reversed-client-id scheme and ships a build:
   - Local smoke: `pnpm prebuild:ios` (= `expo prebuild --platform ios --clean`) then `pnpm ios`; sign in with Google in the dev build → succeeds against NEW iOS client.
   - Release: new EAS build per profile + `ios submit` (ascAppId `6753653055`).
- **Verify:** dev build Google sign-in works; server accepts the NEW `aud` (via C4). Maps render in the app.

---

**C6. [CLI] Swap YouTube client id/secret (env only) → `YOUTUBE_CLIENT_ID` / `YOUTUBE_CLIENT_SECRET`**

- Targets: production only (Vercel) + local. New values: from A5.
- **Do NOT deploy YouTube posting against the new client until D1 mints the matching refresh token** — a new client id/secret with an OLD refresh token will fail (`invalid_grant`). So set these **together with** `YOUTUBE_REFRESH_TOKEN` in C/D-join (see D2). Until then, leave YouTube env on OLD so cron posting keeps working.

---

### PHASE D — YouTube re-consent + iOS release (HUMAN-gated)

---

**D1. [HUMAN] Mint a new `YOUTUBE_REFRESH_TOKEN` against the NEW YouTube client**

No in-repo tool exists. Use OAuth Playground:
1. Open `https://developers.google.com/oauthplayground` → gear → "Use your own OAuth credentials" → paste NEW `YOUTUBE_CLIENT_ID` + `YOUTUBE_CLIENT_SECRET` (the A5 web client, which lists the Playground redirect URI).
2. Step 1: enter scope `https://www.googleapis.com/auth/youtube.upload` → Authorize APIs.
3. Sign in with the **YouTube channel's brand Google account**, grant access.
4. Step 2: Exchange authorization code → copy `refresh_token`.

- **Verify:** token starts `1//…`; belongs to the new client. (Optional: a quick `youtube.videos.list mine=true` with the token to confirm scope/channel.)

---

**D2. [CLI] Swap YouTube env together → deploy**

Set **all three** in prod Vercel + local atomically: `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET` (from A5), `YOUTUBE_REFRESH_TOKEN` (from D1). Redeploy.

- **Verify:** trigger the manual retry path `POST /api/admin/retry-youtube` (auth `ADMIN_SECRET`/`CRON_SECRET`) on a COMPLETED video whose `postingResults.youtube.success===false`, OR wait for the next cron (`/api/tribunal-video/generate` `0 10 * * 0-5`; `/api/news-video/generate` 8/11/14/17). Confirm `youtube.videos.insert` succeeds and the Short appears on the channel. Note `postShortToYouTube` falls back to `GOOGLE_CLIENT_ID/SECRET` only if `YOUTUBE_*` unset — since we set `YOUTUBE_*`, the new YouTube client is used; the refresh token must match it.

---

**D3. [HUMAN] Ship the iOS build (release channel)**

EAS build for `production` + `ios submit` (ascAppId `6753653055`). Once shipped and adopted (or forced as min version), the installed base moves to the NEW iOS client. This is the gate for removing the legacy-aud acceptance (Phase E).

---

### PHASE E — Retire OLD credentials (only after D done + verified)

---

**E1. [CONSOLE] Delete OLD OAuth clients in `pcn-ai`** (web NextAuth, iOS, YouTube) once: web sign-in verified on NEW (C1), new iOS build adopted (D3), YouTube posting verified on NEW (D2). Console under `hello@ezeikel.com`.

**E2. [CLI] Remove the legacy iOS aud acceptance** — drop `GOOGLE_IOS_CLIENT_ID_LEGACY` env + the array-audience fallback (C4a) after the new iOS build is the enforced floor.

**E3. [CLI] Disable/delete OLD API keys + Vision SA in `pcn-ai`**
```bash
gcloud iam service-accounts delete vision-api-access@pcn-ai.iam.gserviceaccount.com \
  --project pcn-ai --account hello@ezeikel.com
gcloud services api-keys delete <OLD_KEY_ID> --project pcn-ai --account hello@ezeikel.com
```
Do the Maps key `bc4d2e13…` in `pcn-ai` too (the `*outsideir35.jobs` referrer key — confirm it is genuinely unused by PTP before deleting; its referrer suggests it belongs to the other project, leave if in doubt per the "investigate before deleting" rule).

**E4.** Leave the `pcn-ai` **project** intact for a cooling-off period; delete only after a full cron cycle + a sign-in/ANPR/Maps/YouTube smoke on NEW with zero Sentry regressions.

---

## SECTION 2 — Env-var swap table

| Var | Scope / target | OLD value source | NEW value source |
|---|---|---|---|
| `GOOGLE_CLIENT_ID` | web Vercel prod+dev, local `apps/web/.env.local` (not preview) | pcn-ai web OAuth client `1069305445287-…` | A3 new web client `475497273257-…` |
| `GOOGLE_CLIENT_SECRET` | web prod+dev, local | pcn-ai (prod was wrongly = YouTube secret `GOCSPX-7TVQWlk`; dev/local `GOCSPX-k_PoT-e`) | A3 new web client secret (set **both** prod+dev to this; fixes drift) |
| `GOOGLE_IOS_CLIENT_ID` | web prod+preview+dev, local | pcn-ai iOS client `1069305445287-…` | A4 new prod iOS client `475497273257-…` (+ keep OLD as `GOOGLE_IOS_CLIENT_ID_LEGACY` until D3) |
| `GOOGLE_APPLICATION_CREDENTIALS_BASE64` | web prod+preview+dev, local | pcn-ai SA `vision-api-access@pcn-ai…` (base64 JSON) | A2 new SA `vision-api-access@parking-ticket-pal…` base64 (`/tmp/ptp-vision-new.b64`) |
| `GOOGLE_GENERATIVE_AI_API_KEY` | web prod+preview+dev, local | (recon: value already NEW `AIzaSyB3JPA5ve…`) | NEW Gemini key (B1-hardened) — **no value change**, harden only |
| `GOOGLE_STREET_VIEW_API_KEY` | web prod+preview+dev, local | (already NEW `AIzaSyCORjlT7B…`) | NEW Street View key (already locked) — **no value change** |
| `NEXT_PUBLIC_GOOGLE_MAPS_JS_API_KEY` | web prod+preview+dev, local | (already NEW `AIzaSyBpxHk9rV…`) | NEW Maps key + B3 referrer lock — **no value change**, harden only |
| `YOUTUBE_CLIENT_ID` | web prod only, local | pcn-ai YouTube client `1069305445287-…` | A5 new YouTube client `475497273257-…` |
| `YOUTUBE_CLIENT_SECRET` | web prod only, local | pcn-ai `GOCSPX-7TVQWlk` | A5 new YouTube client secret |
| `YOUTUBE_REFRESH_TOKEN` | web prod only, local | pcn-ai token (prod `1//038-…`, local `1//04Af4…`) | D1 newly-minted token against A5 client |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | mobile `apps/mobile/.env.local` + EAS env (dev/preview/prod) | pcn-ai iOS `1069305445287-b0q6oltds…` | A4 new prod iOS client |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | mobile local + EAS env | pcn-ai web `1069305445287-1m5mhd9…` | A3 new web client (used as `webClientId`) |
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | mobile local + EAS env | (= web Maps key `AIzaSyBpxHk9rV…`) | NEW Maps iOS key (B2 split) or keep shared NEW key |

Not migrated (not GCP-project credentials): `NEXT_PUBLIC_ADSENSE_*`, `EXPO_PUBLIC_ADMOB_*` (AdSense/AdMob), `EXPO_PUBLIC_USE_VISION_CAMERA` (RN feature flag), `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` (Mapbox).

---

## SECTION 3 — Ordering that guarantees no downtime

The invariant: **for every live capability, a working credential exists at all times.** New creds are created and verified before old ones are removed; for the two cases with installed-base/refresh-token coupling (iOS, YouTube), old and new coexist.

1. **Enable APIs (A1)** — additive, no impact.
2. **Create new SA + OAuth clients + harden keys (A2–A5, B1–B3)** — all additive; OLD still serves prod.
3. **Web swaps, preview→prod, verified one capability at a time (C1 Google sign-in, C2 Vision, C3 keys)** — each verified on a preview before prod; OLD clients/keys stay authorized so a rollback is an env revert.
4. **iOS server verifier accepts both audiences (C4a)** — existing installs (OLD aud) and new builds (NEW aud) both verify. No flag-day.
5. **Mobile env + new build (C5)** — new build uses NEW client; existing installs keep using OLD client, both accepted by the server.
6. **YouTube: keep OLD env live until D1 mints the NEW refresh token; then swap all three YouTube vars together (C6+D2).** Never run a NEW client id with an OLD refresh token. Cron posting continues on OLD until the atomic swap.
7. **Ship iOS release (D3); only after adoption, remove legacy aud (E2) and delete OLD clients/keys/SA (E1, E3).**
8. **Keep `pcn-ai` project alive through a full cron cycle + smoke (E4).**

At no point is a capability left without a valid credential.

---

## SECTION 4 — Rollback per step

- **A1 (enable APIs):** no rollback needed; leaving APIs enabled is harmless.
- **A2 (Vision SA):** if the new SA misbehaves, env still points at OLD until C2; just don't swap. To undo: delete the new SA + key.
- **A3–A5 (OAuth clients):** unused until env swap; delete the new client to roll back. OLD clients untouched.
- **B1–B3 (key hardening):** if a restriction breaks a call (e.g. referrer too tight, missing API target), widen/remove the restriction via `gcloud services api-keys update` (or console). Because these keys already serve prod values, test the restriction on a preview first; if a prod page breaks, revert the restriction immediately (single `update` call).
- **C1 (Google web OAuth):** revert `GOOGLE_CLIENT_ID/SECRET` to OLD values in Vercel + redeploy. OLD client still authorized (not deleted until E1).
- **C2 (Vision):** revert `GOOGLE_APPLICATION_CREDENTIALS_BASE64` to OLD base64; redeploy. OLD SA still active until E3.
- **C3 (keys):** if a NEW key fails, the env value is unchanged (same string) — rollback is removing the restriction (B-level), not the value. If you did swap a value, revert to the prior string.
- **C4 (server iOS verifier):** if array-aud change breaks verification, revert to single OLD `GOOGLE_IOS_CLIENT_ID`; existing installs keep working.
- **C5 (mobile build):** installed apps are unaffected by a bad new build (they run the previously installed binary on OLD client). Roll back by not promoting the EAS build / not forcing min version. Revert `.env.local` + EAS vars to OLD if rebuilding.
- **C6+D2 (YouTube):** revert all three `YOUTUBE_*` to OLD values + redeploy; OLD client + OLD refresh token still valid until E1. The manual retry route re-posts any video that failed during the window.
- **D1 (mint token):** purely additive; a bad token just isn't deployed.
- **D3 (iOS release):** standard App Store rollback (don't force min version; previous build keeps working on OLD client).
- **E1–E4 (retirement):** point of no easy return — gated on all prior verifications. If a regression surfaces post-deletion, you must re-create the client/SA in NEW (clients) — so do E only after a clean full cron cycle + smoke.

---

## SECTION 5 — What the USER must personally do

These cannot be done by the agent:

1. **Approve/sit with the Chrome (console) actions** under `hello@chewybytes.com` authuser=1 for OAuth client + consent-screen creation (A3, A4, A5) — agent can drive Chrome MCP but you should confirm consent-screen details, test-user additions, and bundle-id/redirect-URI correctness.
2. **Mint the new `YOUTUBE_REFRESH_TOKEN` (D1)** via OAuth Playground, signing in with the **YouTube channel's brand Google account** and granting `youtube.upload`. The agent cannot complete an interactive Google consent. Hand back the `refresh_token`.
3. **Ship the iOS build (C5 step 3 + D3):** run `pnpm prebuild:ios` + a local sign-in smoke, then trigger the EAS production build and `ios submit` (ascAppId `6753653055`), and decide the minimum-version enforcement that retires the OLD iOS client. (Agent can prepare env + EAS vars and source is already env-driven, but you ship/submit the release.)
4. **Sign in to confirm web Google auth on prod (C1)** if you prefer to verify on the live domain rather than a temporary preview (Google web OAuth + YouTube vars don't exist on preview).
5. **Confirm before any E-phase deletion** that web sign-in, ANPR (Vision), Maps/Street View, and YouTube posting have each been observed working on the NEW project, with no Sentry regressions, across a full cron cycle — then authorize deleting OLD clients/keys/SA, and finally the `pcn-ai` project.

Everything else (enable APIs, create+harden the Vision SA, harden/split keys, all Vercel + `.env.local` + EAS env writes, preview deploys, verification calls, OLD-cred deletion commands) the agent can execute once you greenlight each phase.

---

Key files for execution: `/Users/ezeikel/Development/Personal/ptp/parking-ticket-pal/apps/web/.env.local`, `/Users/ezeikel/Development/Personal/ptp/parking-ticket-pal/apps/mobile/.env.local`, `/Users/ezeikel/Development/Personal/ptp/parking-ticket-pal/apps/mobile/app.config.ts` (env-derived bundle ids + reversed-client-id scheme), `/Users/ezeikel/Development/Personal/ptp/parking-ticket-pal/apps/mobile/contexts/auth.tsx` (`GoogleSignin.configure`), `/Users/ezeikel/Development/Personal/ptp/parking-ticket-pal/apps/web/lib/video-completion.ts` (`postShortToYouTube`), `/Users/ezeikel/Development/Personal/ptp/parking-ticket-pal/apps/web/vercel.json` (YouTube crons). The server-side iOS token-verify path (consumer of `GOOGLE_IOS_CLIENT_ID`) needs the array-audience edit for C4a — locate it in the mobile sign-in verify action under `apps/web` before executing C4.