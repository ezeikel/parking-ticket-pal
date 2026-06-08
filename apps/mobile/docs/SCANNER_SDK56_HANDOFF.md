# Scanner — session handoff (Apple Vision live detector + confidence-weighted OCR voting)

Pick-up doc for continuing the mobile ticket scanner in a fresh Claude session on
another machine. **Everything described here is already committed + pushed to
`main`** — just `git pull` on the other laptop.

Last commit at handoff: `af2a5b6 feat(scanner): live OCR chips via Apple Vision with confidence-weighted voting`
(+ `5106993` iOS Vision detector). This supersedes the prior "SDK 56" handoff —
its big open question, "green/OpenCV vs Vision, do we still need Vision?", is now
answered: **Vision wins and is the live iOS detector.**

---

## TL;DR — where we are

The iOS scanner now uses **Apple Vision** as the live "premium" document detector,
and the live OCR chips use **Apple Vision OCR with confidence-weighted consensus
voting**. Validated on a real iPhone — the Vision quad hugs the ticket at **0.99
confidence**, clearly beating OpenCV. OpenCV remains the fallback (low Vision
confidence) and the Android detector.

### Validated on device ✅
- Apple Vision live document detector — hugs the ticket edges at 0.99, handheld/angled.
- The green (OpenCV) + magenta (Vision) **A/B overlay** on the capture-preview
  screen. User's call: magenta (Vision) is the most accurate; green is good but
  less so.
- Live OCR chips (PCN / Reg / Issuer) appear **while framing** (before capture).

### NOT done / unverified ❌
- **Chips don't show on the capture-preview screen.** Root-caused as a stale
  closure (`handleCapture` read `liveOCR.pcn` from a memoised callback that didn't
  list `liveOCR` as a dep → snapshotted empty values). **Fixed in code** —
  `handleCapture` now reads `liveOCR.getFields()` (a stable ref) — but **NOT yet
  verified** (couldn't rebuild on the dev machine; see SentinelOne note). **First
  thing to re-test.**
- **Confidence-weighted OCR voting** — built + adversarially reviewed this
  session, but only its latest-wins predecessor was device-tested. Verify on
  device: chips should fill/self-correct as you reframe, and outvote a one-frame
  misread.
- **"Keep both squares"** (user wants this) — the A/B overlay is currently
  spike/debug code; promote it to an intentional feature (see Open items).

---

## What this session built (commits `5106993` + `af2a5b6`)

1. **iOS Apple Vision document detector as a VisionCamera frame-processor**
   (`modules/document-detector/ios/VisionDocumentPlugin.mm`, NEW):
   - Runs `VNDetectDocumentSegmentationRequest` on each live frame (oriented
     upright via the frame orientation), returns 4 corners + confidence.
   - `hooks/useDocumentDetection.ts` Vision-primary branch: when Vision conf ≥ 0.5,
     feed its corners as `bestContour` (inverse-rotated to raw-sensor space so the
     existing smoothing / state-machine / overlay pipeline is unchanged), skip
     OpenCV. OpenCV runs as fallback + on Android.
   - `DocumentDetector.podspec` adds the `VisionCamera` dependency + `-ObjC`.
   - ⚠️ **Apple Vision doc-segmentation does NOT work on the iOS Simulator**
     (returns a degenerate band — limited sim Vision support). It is **device-gated**
     — only validate the live quad on a real device. (Vision OCR / `VNRecognizeText`
     DOES work on the sim, so the live chips are sim-testable.)

2. **Live OCR via Apple Vision + confidence-weighted consensus voting:**
   - Native `recognizeText` (`DocumentDetectorModule.swift`) now returns per-line
     `{text, confidence}` (was a flat string) — surfacing Vision's confidence.
   - `utils/extractTicketFields.ts` adds `extractTicketFieldCandidates(lines)` —
     per-line weighted candidates; captures within-read multiplicity (a VRM
     printed 3× on a ticket = 3 votes). Old `extractTicketFields(text)` kept.
   - `hooks/useLiveTicketOCR.ts` accumulates per-field **weighted vote tallies**
     across reads; the argmax value wins. A one-frame misread is outvoted; a blank
     read can't wipe a found value; a **generation token** discards in-flight reads
     after a reset (no cross-ticket contamination). iOS weights by Vision
     confidence; Android (ML Kit, no confidence) is count-based. Exposes
     `getFields()` / `reset()`.
   - `VisionCameraScanner.tsx` re-read loop gathers ~3 reads so the vote has
     evidence; resets votes on a new framing session (debounced ~600ms so a
     one-frame detection blip doesn't wipe the running consensus).
   - **Adversarial multi-agent review was run** on this: found 1 blocker
     (in-flight OCR read racing a reset → fixed with the generation token) + 2
     warnings (genuine-zero Vision confidence shouldn't weight as 1 → fixed;
     `documentDetected` one-frame flicker on the confidence exit-ramp → fixed by
     dropping the redundant `conf > 0.3` JS gate + debouncing the reset). The
     native↔JS bridge (Swift Float → JS number) was verified against
     expo-modules-core source.

3. **Capture-preview chip fix** (`VisionCameraScanner.tsx` `handleCapture`): read
   chips via the stable `liveOCR.getFields()` ref. Committed, **untested**.

---

## Open items / next steps (priority order)

1. **Rebuild on the other laptop + validate on a real iPhone** (recommended:
   `npx expo run:ios --device` — see Build section):
   - Confirm the Vision quad still hugs (device-gated — no sim).
   - **Verify chips now appear on the capture-preview screen** (the `getFields`
     fix). If still blank: `PostCapturePreview` renders chips when
     `(livePcn || liveVrm || liveIssuer) && !isProcessing`; confirm `capturedOCR`
     is populated at capture time (`handleCapture`).
   - Verify the voting: reframe a ticket → chips fill / self-correct; point at a
     different ticket → chips re-read fresh.
2. **"Keep both squares" — promote the A/B overlay from spike → feature.** Magenta
   (Vision) is most accurate, green (OpenCV) good-but-less. Easy part: keep both
   on the capture-preview (already drawn there in `PostCapturePreview.tsx`).
   Bigger part (optional): also show both **live** — the live screen currently
   draws only the active detector's quad (Vision on iOS); showing both live would
   mean running OpenCV alongside Vision in the worklet. Vision = source of truth
   for any crop.
3. **Phase 2 — remove ML Kit from iOS.** iOS now uses Vision OCR, so the ML Kit
   pod is dead weight on iOS. Make `react-native.config.js` strip ML Kit iOS
   unconditionally (keep the npm dep + the Android path).
4. **Phase 5 — ticket classifier.** Reject non-tickets via an OCR keyword/field
   gate (reuse `extractTicketFields` signals) → "doesn't look like a parking
   ticket." Cross-platform JS.
5. **Cleanup (after the above is confirmed):** the `__scannerDebug` probes and the
   green/magenta A/B "spike" labels are intentionally still in the code for
   validation. Strip / make intentional once happy.

---

## How to build (UPDATED — the prior "always --local" is now nuanced)

- **Recommended — `npx expo run:ios --device`** (iPhone plugged in). Uses
  `xcodebuild` directly (no Fastlane); it's a dev build so the `__DEV__`
  diagnostics (`globalThis.__scannerDebug` — `visionPluginLinked`, `visionRaw`,
  `ocrVotes`, chips, etc.) are readable over the Metro JS debugger. Best for
  validating the detector + voting.
- **Release `.ipa` — `pnpm eas:build:preview:ios:local`** — needs Fastlane
  (`brew install fastlane`). Standalone, `__DEV__` off (diagnostics stripped).
- ⚠️ **EAS CLOUD build currently FAILS** in the "Install dependencies" phase — the
  monorepo's `sharp` (a web dep) fails to build from source on the EAS worker.
  Use local/device until that's fixed (pin node, or stop the mobile build building
  sharp).
- The new local module (`VisionDocumentPlugin.mm`) + the `VisionCamera` dep on its
  podspec are picked up by `expo prebuild` automatically. **If you ever run a bare
  `expo prebuild`, use `--clean`** — a cached prebuild does NOT re-evaluate a local
  module's podspec/new files (this bit us; `pnpm prebuild:ios` already uses
  `--clean`).
- If the iPhone's UDID isn't on the new machine's provisioning profile yet:
  `eas device:create` (Enter UDID manually; get it from
  `xcrun devicectl device info details --device <id>` → `hardwareProperties.udid`).

---

## Dev-machine note (machine-specific — a clean laptop won't have this)

The original dev machine has **SentinelOne EDR**, which on 2026-06-05 ~10:31
false-positived a `persistence_deception` detection and **quarantined ~706
dev-tool executables AND `.plist` files** (node, npm, pnpm, bun, turbo, brew,
cocoapods, ruby, libyaml, `node_modules/**/bin/*`, `.husky/pre-commit`, and even
build-artifact plists like an `xcframework`'s `Info.plist`). This repeatedly broke
the toolchain and ultimately blocked the iOS build (it eats the plists the build
generates). **It is machine-specific — a clean/other laptop won't have it.** The
real fix is the SentinelOne **management console**: unquarantine + add path
exclusions (`~/.nvm`, `~/.bun`, `/opt/homebrew`, `~/.local`, `**/node_modules/**`,
`~/Development/dev-stack`) — the local agent is view-only. Do NOT chase it by
reinstalling tools (whack-a-mole). On the original machine a full incident writeup
lives at `~/.claude/sentinelone-dev-toolchain-quarantine.md`.

---

## Constraints / gotchas (carry forward)

- **Work on `main`, push straight to `main`.** Pre-revenue, no PR overhead for
  AI-authored changes. Semantic commits, one-liners, no Claude attribution.
- **React lockstep `19.2.3`** across all workspaces (root `resolutions`). Dual
  React = "Invalid hook call". Bump everywhere or nowhere.
- **Never hand-edit `ios/`/`android/`** — CNG regenerates them. Native config via
  config plugins (`apps/mobile/plugins/`); native code via local Expo modules
  (`apps/mobile/modules/`).
- **SDK 56 load-bearing native fixes (do NOT revert):**
  - `plugins/withAdMobStaticFramework.js` sets
    `$RNGoogleMobileAdsAsStaticFramework = true` so ONLY admob is a static
    framework. Global `useFrameworks: "static"` was REMOVED from `app.config.ts`
    (under SDK 56 / RN 0.85 it broke header visibility for Skia `base64.h` etc.).
  - `@shopify/react-native-skia` pinned `2.6.4` (2.6.2 hit the base64 header bug).
  - `@expo/dom-webview` excluded via `expo.autolinking.exclude` (unused transitive
    dep whose Swift won't compile under RN 0.85).
  - iOS `deploymentTarget` `16.4` (SDK 56 min).
  - The `document-detector` local module links via SDK 56 autolinking
    (`expo.autolinking.nativeModulesDir: "./modules"` + the module's
    `package.json`).
- Pre-existing TS errors (jest globals in `__tests__`, FlashList
  `estimatedItemSize`, analytics event-name unions, TicketForm nullability) are
  unrelated and do NOT gate Metro/EAS builds.

---

## Files that matter (scanner)

- `modules/document-detector/ios/VisionDocumentPlugin.mm` — **NEW** live Vision
  frame-processor detector.
- `modules/document-detector/ios/DocumentDetectorModule.swift` — Vision OCR
  (`recognizeText` → per-line `{text,confidence}`) + the PostCapture A/B
  `detectDocument`.
- `modules/document-detector/{index.ts, src/DocumentDetectorModule.ts}` — JS
  binding (`RecognizedTextLine`).
- `hooks/useDocumentDetection.ts` — detector worklet: Vision-primary branch +
  OpenCV fallback + the `onDocumentSteady` OCR trigger.
- `hooks/useLiveTicketOCR.ts` — confidence-weighted OCR voting; `getFields()` /
  `reset()`; per-field vote tallies.
- `utils/extractTicketFields.ts` — `extractTicketFieldCandidates` (weighted,
  per-line) + the original `extractTicketFields`.
- `components/VisionCameraScanner/VisionCameraScanner.tsx` — wires detector →
  overlay → OCR; the re-read loop; capture; `handleCapture` chip freeze.
- `components/VisionCameraScanner/PostCapturePreview.tsx` — capture preview,
  draggable corners, the green/magenta A/B overlay + Vision call + chip stack.
- `components/VisionCameraScanner/DocumentOverlay.tsx` — live Skia quad + chip
  stack (safe-area-aware top-right).

## Release pipeline (when ready to ship)

`pnpm release patch|minor|major` from `apps/mobile` builds iOS+Android locally
from the same commit and submits to both stores in lockstep. See
`apps/mobile/docs/RELEASE.md`.
