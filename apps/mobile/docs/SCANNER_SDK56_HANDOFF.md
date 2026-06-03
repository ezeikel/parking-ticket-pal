# Scanner + SDK 56 — session handoff

Pick-up doc for continuing the scanner work on another machine in a fresh
Claude session. Everything described here is **already committed and pushed to
`main`** — just `git pull` on the other laptop.

Last commit at handoff: `238ddd3 fix(scanner): pass image orientation to Vision so the magenta quad lines up`

---

## TL;DR — where we are

1. **Expo SDK 56 upgrade is DONE and builds** (RN 0.85, React 19.2.3). First
   successful SDK 56 iOS build was verified on a physical iPhone.
2. **Live OCR chip overlay** — the original feature — was NEVER appearing on a
   physical device. Root cause found and **fixed in code** (commit `9fdfc4b`),
   but **NOT yet verified on a device** (simulator was busy).
3. **Apple Vision document-detection spike** (the green-vs-magenta A/B) — the
   magenta quad was projecting way off; **fixed in code** (commit `238ddd3`),
   **not yet verified**.
4. Both fixes are pure JS/Swift/config — they need a rebuild + on-device test
   to confirm.

**Immediate next step on the other machine: rebuild the preview IPA, install
on a physical iPhone, and verify (a) chips now appear while framing a ticket,
and (b) the magenta Vision quad now lines up with the document.**

---

## How to build (this project always builds EAS locally)

```bash
cd apps/mobile
pnpm eas:build:preview:ios:local
```

- Always `--local` — never Expo cloud build servers.
- Output `.ipa` lands at `apps/mobile/build-<timestamp>.ipa`.
- Install on a physical iPhone via Orbit, or:
  `xcrun devicectl device install app --device <udid> <path-to-ipa>`
- The build profile is `preview` (PTPInternal). It includes ML Kit (real
  on-device OCR) and the Vision module — unlike the dev/simulator build which
  strips ML Kit.

If the iPhone's UDID isn't registered yet on the new machine's provisioning
profile, run `eas device:create` (pick "Enter UDID manually" — get the UDID
from `xcrun devicectl device info details --device <id>` under
`hardwareProperties.udid`), then rebuild.

---

## What was fixed and why (the two scanner fixes to verify)

### Fix 1 — Live OCR chips never appeared (commit `9fdfc4b`)

**Symptom:** the PCN / Reg / Issuer chips never showed on the camera screen OR
the post-capture screen, on a physical device. (They worked on the simulator
via SimCam, which masked the bug.)

**Root cause:** `useLiveTicketOCR` triggered OCR on `stabilityProgress`
crossing 0→>0. That progress only climbs when the detected polygon holds within
**3% movement for 8 consecutive frames** (the auto-capture stability bar).
A static SimCam image satisfies that trivially; a handheld phone never does
(natural shake keeps resetting the counter), so OCR never ran → no fields →
no chips, ever.

**The fix:** added a separate, looser **`onDocumentSteady`** signal in
`hooks/useDocumentDetection.ts` — fires when a document is detected and held
within **12% movement for ~4 frames** (`OCR_STEADY_FRAMES`,
`OCR_MOVEMENT_THRESHOLD`, `OCR_CONFIDENCE_THRESHOLD`), latched once per framing
session, reset when the document leaves frame. `VisionCameraScanner.tsx` bumps
an `ocrTrigger` counter on that signal, and `useLiveTicketOCR` now fires once
per increment (was watching `stabilityProgress`). The strict auto-capture
stability path is untouched, so green polygon detection is unaffected.

**To verify:** install on iPhone, open scanner, frame a ticket and hold roughly
steady (~0.5s). Chips should populate top-right. If they still don't:
- The hook snaps a throwaway `takePhoto()` to feed ML Kit; check it isn't
  failing. Errors are sent to **Sentry** with tag `source: useLiveTicketOCR`
  and also written to `globalThis.__scannerDebug` (readable via the Metro JS
  debugger). Also `__scannerDebug.ocrTriggerFired` timestamps each trigger.
- If `ocrTriggerFired` never updates, the loose steady signal still isn't
  firing — loosen `OCR_MOVEMENT_THRESHOLD` further or drop `OCR_STEADY_FRAMES`.

### Fix 2 — Vision A/B magenta quad was way off (commit `238ddd3`)

**Context:** there's a debug A/B overlay on the PostCapture screen drawing two
quads — **green = OpenCV** (the shipping detector) and **magenta = Apple Vision
`VNDetectDocumentSegmentation`** (the spike) — plus a Vision confidence readout.
It's spike/debug code, not a shipping feature.

**Symptom:** magenta drew a small quad floating over the wrong part of the
document, even though Vision reported ~0.76 confidence (it DID find the doc).

**Root cause:** `modules/document-detector/ios/DocumentDetectorModule.swift`
decoded the JPEG to a raw `cgImage` and ran Vision **without** the image's EXIF
orientation, so Vision analysed sideways pixels while PostCapture rendered the
photo oriented → quad rotated/offset. It also reported raw `cgImage.width/height`
instead of display dimensions.

**The fix:** map `UIImage.imageOrientation` → `CGImagePropertyOrientation`, pass
it to `VNImageRequestHandler(cgImage:orientation:options:)`, and report
`uiImage.size` (orientation-aware) as the dimensions the JS projection uses.

**To verify:** capture a ticket, look at PostCapture. Magenta should now hug the
document like green does. Then judge: **does Vision beat the (now much better)
green/OpenCV detector?**

---

## THE KEY DECISION waiting for you

Before the SDK 56 upgrade, OpenCV/green detection was bad (latched onto wood-
grain/floor texture), which is why we explored Apple Vision. **After the
upgrade, green got dramatically better** — in the last device test green hugged
the document corners well and looked shippable.

So the open question is: **now that green is good, do we still need Vision at
all?**

- If green holds up across more tickets/lighting/backgrounds → **shelve Vision**:
  rip out the magenta A/B overlay, the `modules/document-detector` local module,
  and the Vision projection code in `PostCapturePreview.tsx`. Ship the clean
  OpenCV scanner.
- If green still mis-tracks on hard cases and Vision (now projecting correctly)
  clearly wins → keep Vision, wire it into the live path properly (it's iOS-only;
  Android would keep OpenCV).

The user's stated plan: **"fix projection, then leave it if green still wins,
and focus on the overlay"** (the overlay = the chips, Fix 1). So priority order
on pickup:
1. Verify chips work (Fix 1) — this is the feature that started everything.
2. Verify Vision projection (Fix 2), do the green-vs-Vision A/B.
3. If green wins, shelve Vision; otherwise decide.

---

## Important constraints / gotchas (carry into the new session)

- **Work directly on `main`, push straight to main.** Pre-revenue, no PR
  overhead for AI-authored changes.
- **EAS builds are ALWAYS local** (`--local`). Never Expo cloud servers.
- **Monorepo React lockstep:** `react`/`react-dom` must be the SAME version
  across `apps/web`, `apps/mobile`, `apps/extension`. Currently `19.2.3`,
  pinned via root `package.json` `resolutions`. If you bump React anywhere,
  bump everywhere or you get dual-React "Invalid hook call" hell.
- **Never hand-edit `ios/`/`android/`** — regenerated by `expo prebuild`. All
  native config goes through config plugins in `apps/mobile/plugins/`.
- **SDK 56 native-build fixes that are load-bearing** (don't revert these):
  - `plugins/withAdMobStaticFramework.js` injects
    `$RNGoogleMobileAdsAsStaticFramework = true` so ONLY admob is a static
    framework. Global `useFrameworks: "static"` was REMOVED from
    `app.config.ts` because under SDK 56/RN 0.85 it broke header visibility for
    Skia (`base64.h not found`) and other pods (`RCTConvert` not in scope).
  - `@shopify/react-native-skia` is `2.6.4` (2.6.2 hit the base64 header bug).
  - `@expo/dom-webview` is excluded via `expo.autolinking.exclude` in
    `apps/mobile/package.json` — it's an unused transitive dep (you use no DOM
    components) whose Swift wouldn't compile under RN 0.85.
  - iOS `deploymentTarget` is `16.4` (SDK 56 minimum).
- **The `document-detector` local Expo module** only links because SDK 56's
  autolinking includes local `modules/`. It needs a `package.json` (present)
  and `expo.autolinking.nativeModulesDir: "./modules"` (present). On SDK 55 it
  silently failed to link — don't be surprised if older notes mention that.

## Known non-blocking cleanup (NOT done, safe to defer)

- **TypeScript 6.0 surfaced ~25 `Cannot find name 'describe/it/expect'` errors**
  in `__tests__/getStatusesForCategory.test.ts` (Jest globals not typed).
  Test-only, doesn't affect the build or the app. Fix later by adding jest to
  the tsconfig `types` (carefully — don't break Expo's ambient types). Plus the
  ~10 pre-existing shipped-code TS errors (analytics event names, FlashList
  `estimatedItemSize` from FlashList v2, TicketForm nullability) that predate
  all of this.

## Files that matter for the scanner

- `apps/mobile/hooks/useDocumentDetection.ts` — the OpenCV frame-processor
  detector + the new `onDocumentSteady` OCR trigger.
- `apps/mobile/hooks/useLiveTicketOCR.ts` — runs ML Kit OCR on the steady
  signal, exposes chip fields. Falls back to a `__DEV__` mock when ML Kit's
  native module isn't linked (simulator).
- `apps/mobile/components/VisionCameraScanner/VisionCameraScanner.tsx` — wires
  detector → overlay → OCR; owns `ocrTrigger`.
- `apps/mobile/components/VisionCameraScanner/DocumentOverlay.tsx` — Skia
  polygon + the chip stack (safe-area-aware top-right).
- `apps/mobile/components/VisionCameraScanner/PostCapturePreview.tsx` — capture
  preview, draggable corners, the green-vs-magenta A/B overlay + Vision call.
- `apps/mobile/components/VisionCameraScanner/CameraSheet.tsx` — the bottom-
  sheet wrapper (fullscreen camera, no drag handle during scanning).
- `apps/mobile/modules/document-detector/` — the local Apple Vision module.

## Release pipeline (for when this is ready to ship)

`pnpm release patch|minor|major` from `apps/mobile` builds iOS+Android locally
from the same commit and submits to both stores in lockstep. See
`apps/mobile/docs/RELEASE.md`.
