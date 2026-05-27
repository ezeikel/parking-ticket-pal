# Mobile release pipeline

This doc covers how versions, build numbers, and store submissions work for the iOS and Android apps.

## TL;DR

```bash
# from apps/mobile/
pnpm release patch          # 1.0.3 → 1.0.4, builds both platforms, auto-submits
pnpm release minor          # 1.0.3 → 1.1.0
pnpm release 1.2.3          # explicit version

# common flags
pnpm release patch --ios-only       # only build iOS
pnpm release patch --android-only   # only build Android
pnpm release patch --no-submit      # build but don't push to stores
pnpm release patch --dry-run        # show what would happen
```

The script handles everything: pre-flight checks → drift detection → version bump → commit + tag → build iOS → build Android → submit.

## How versioning works

There are **two** numbers per platform:

| Number | What it is | Where it's set |
|---|---|---|
| `version` (e.g. `1.0.4`) | The marketing version users see in the store | `package.json` → read by `app.config.ts:24` |
| `buildNumber` (iOS) / `versionCode` (Android) | Internal counter, must always increase per submission | Managed remotely by EAS (`appVersionSource: "remote"` in `eas.json`) |

So `1.0.4 (211)` on iOS means version `1.0.4`, build `211`.

### Why iOS and Android drifted before

Previously, the only way to bump the version was to manually edit `package.json` and run `pnpm eas build`. If you only ran the iOS build before forgetting about Android (or vice versa), the two stores ended up on different versions and different commits. That's exactly what happened:

- iOS prod: `v1.0.3 (210)` from commit `93b879a` on Mar 23
- Android prod: `v1.0.1 (25)` from commit `1669f44` on Mar 17

Six days and two version numbers apart.

The `pnpm release` script solves this by **always building both platforms from the same commit**, with the same `package.json` version, in one command.

## What `pnpm release` does

1. **Pre-flight**
   - Working tree must be clean.
   - Must be on `main` (override with `FORCE=1` if you really mean it).
   - Local `main` must be in sync with `origin/main`.
2. **Drift check** — fetches the last finished production build for iOS and Android from EAS. Warns if they were built from different commits or different versions. (Skipped with `--skip-drift-check`.)
3. **Version bump** — updates `package.json` to the next `patch` / `minor` / `major` (or an explicit `X.Y.Z`).
4. **Commit and tag** — creates a commit `chore(mobile): release vX.Y.Z` plus a git tag `mobile-vX.Y.Z`, pushes both to origin.
5. **Build iOS** — `eas build --profile production --platform ios --local --auto-submit`. Local build on your machine, then submit to App Store Connect.
6. **Build Android** — `eas build --profile production --platform android --local --auto-submit`. Local build, then submit to Play Console.

Both builds are pinned to the just-pushed commit, so they share the same JS bundle and native config.

## Profiles

| Profile | Where it lands | When you'd use it |
|---|---|---|
| `development` | iOS Simulator / Android Emulator dev client | Day-to-day dev. `pnpm prebuild:ios && pnpm ios`. |
| `preview` | Physical device (.ipa for iOS, .apk for Android), sideloaded via Orbit / `adb install` | Testing a feature on your phone before releasing |
| `production` | App Store + Play Store | Real releases |

To make a preview build for your own phone:

```bash
pnpm eas:build:preview:ios:local       # produces an .ipa, install via Orbit
pnpm eas:build:preview:android:local   # produces an .apk
```

## Checking what's currently live

```bash
# Last 5 finished builds across both platforms
eas build:list --status finished --limit 5

# Just iOS
eas build:list --platform ios --status finished --limit 3

# Just Android
eas build:list --platform android --status finished --limit 3
```

## Manual recovery

If for some reason you need to do a release the old manual way:

1. Edit `apps/mobile/package.json` and bump `version`.
2. Commit and push.
3. `pnpm eas:build:production` — builds both platforms locally. Add `--platform ios` or `--platform android` to scope it.
4. `pnpm eas:submit:production` — submits whatever's already built.

But please just use `pnpm release` — that's the whole point of the script.

## OTA updates

`runtimeVersion: { policy: "appVersion" }` in `app.config.ts` means OTA updates (via `eas update`) are scoped per app version. If you push an update, it'll only go to users running the matching `version`. After a `pnpm release patch` (1.0.3 → 1.0.4), any pending OTA for 1.0.3 won't reach 1.0.4 users — they get the natively-bundled JS for 1.0.4.

This is the safe behaviour: OTAs can't push out-of-sync JS to a native shell that wasn't built for it.
