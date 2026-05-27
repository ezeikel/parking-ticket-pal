#!/usr/bin/env node
/**
 * Releases a new mobile app version to BOTH iOS and Android from the same commit.
 *
 * What it does:
 *   1. Sanity-checks: clean working tree, on main, in sync with origin.
 *   2. Reads the previous releases of iOS and Android from EAS and warns if
 *      they were built from different commits (drift detection).
 *   3. Bumps `package.json` version (patch / minor / major).
 *   4. Commits the bump with a release tag (`mobile-vX.Y.Z`).
 *   5. Triggers a local `eas build --profile production` for iOS, then Android,
 *      pinned to the same git commit — keeping the two stores in lockstep.
 *   6. Optionally auto-submits each platform to its store.
 *
 * Usage:
 *   pnpm release patch                  # 1.0.3 → 1.0.4
 *   pnpm release minor                  # 1.0.3 → 1.1.0
 *   pnpm release major                  # 1.0.3 → 2.0.0
 *   pnpm release 1.2.3                  # explicit version
 *
 *   pnpm release patch --ios-only       # only build iOS
 *   pnpm release patch --android-only   # only build Android
 *   pnpm release patch --no-submit      # build but don't auto-submit
 *   pnpm release patch --dry-run        # show what would happen, do nothing
 */
import { execSync, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP_DIR = resolve(__dirname, '..');
const PKG_PATH = resolve(APP_DIR, 'package.json');

const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};
const log = {
  info: (m) => console.log(`${ANSI.cyan}→${ANSI.reset} ${m}`),
  ok: (m) => console.log(`${ANSI.green}✓${ANSI.reset} ${m}`),
  warn: (m) => console.log(`${ANSI.yellow}⚠${ANSI.reset}  ${m}`),
  err: (m) => console.error(`${ANSI.red}✗${ANSI.reset} ${m}`),
  step: (m) => console.log(`\n${ANSI.bold}${m}${ANSI.reset}`),
};

function sh(cmd, opts = {}) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts }).trim();
}
function shStream(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { stdio: 'inherit', ...opts });
  if (res.status !== 0) throw new Error(`Command failed: ${cmd} ${args.join(' ')}`);
}

function parseArgs(argv) {
  const args = { bump: null, explicit: null, iosOnly: false, androidOnly: false, noSubmit: false, dryRun: false, skipDriftCheck: false };
  for (const arg of argv) {
    if (arg === '--ios-only') args.iosOnly = true;
    else if (arg === '--android-only') args.androidOnly = true;
    else if (arg === '--no-submit') args.noSubmit = true;
    else if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--skip-drift-check') args.skipDriftCheck = true;
    else if (['patch', 'minor', 'major'].includes(arg)) args.bump = arg;
    else if (/^\d+\.\d+\.\d+$/.test(arg)) args.explicit = arg;
    else if (arg === '--help' || arg === '-h') {
      console.log(readFileSync(__filename, 'utf8').split('\n').slice(1, 24).join('\n').replace(/^\s*\*\s?/gm, ''));
      process.exit(0);
    } else {
      log.err(`Unknown arg: ${arg}`);
      process.exit(1);
    }
  }
  if (!args.bump && !args.explicit) {
    log.err('Specify a bump (patch|minor|major) or explicit version (X.Y.Z)');
    process.exit(1);
  }
  return args;
}

function nextVersion(current, args) {
  if (args.explicit) return args.explicit;
  const [maj, min, pat] = current.split('.').map(Number);
  if (args.bump === 'patch') return `${maj}.${min}.${pat + 1}`;
  if (args.bump === 'minor') return `${maj}.${min + 1}.0`;
  if (args.bump === 'major') return `${maj + 1}.0.0`;
  throw new Error(`Bad bump: ${args.bump}`);
}

function checkPreflight() {
  log.step('1. Pre-flight checks');

  const status = sh('git status --porcelain');
  if (status.trim()) {
    log.err('Working tree is dirty. Commit or stash first.');
    console.log(status);
    process.exit(1);
  }
  log.ok('Clean working tree');

  const branch = sh('git rev-parse --abbrev-ref HEAD');
  if (branch !== 'main') {
    log.warn(`On branch '${branch}', not 'main'. Releases should be cut from main.`);
    if (process.env.FORCE !== '1') {
      log.err('Aborting. Re-run with FORCE=1 if you really mean to release from a non-main branch.');
      process.exit(1);
    }
  } else {
    log.ok('On main');
  }

  sh('git fetch origin', { stdio: 'inherit' });
  const local = sh('git rev-parse HEAD');
  const remote = sh('git rev-parse origin/main').catch(() => null);
  if (remote && local !== remote) {
    log.err(`Local main (${local.slice(0, 7)}) and origin/main (${remote.slice(0, 7)}) have diverged. Pull/push first.`);
    process.exit(1);
  }
  log.ok('In sync with origin/main');
}

function checkDriftFromLastRelease() {
  log.step('2. Drift check (previous iOS vs Android release commits)');
  try {
    const raw = sh('eas build:list --status finished --limit 30 --json --non-interactive');
    const builds = JSON.parse(raw);

    const lastIOS = builds.find((b) => b.platform === 'IOS' && b.buildProfile === 'production');
    const lastAndroid = builds.find((b) => b.platform === 'ANDROID' && b.buildProfile === 'production');

    if (!lastIOS || !lastAndroid) {
      log.warn('No previous production build for one of the platforms — skipping drift check.');
      return;
    }

    const iosCommit = lastIOS.gitCommitHash?.slice(0, 7) ?? '?';
    const androidCommit = lastAndroid.gitCommitHash?.slice(0, 7) ?? '?';

    console.log(`  Last iOS prod:     v${lastIOS.appVersion} (build ${lastIOS.appBuildVersion}) @ ${iosCommit}`);
    console.log(`  Last Android prod: v${lastAndroid.appVersion} (build ${lastAndroid.appBuildVersion}) @ ${androidCommit}`);

    if (lastIOS.gitCommitHash === lastAndroid.gitCommitHash && lastIOS.appVersion === lastAndroid.appVersion) {
      log.ok('Previous release was lockstep across platforms.');
    } else {
      log.warn(`Drift detected. Previous releases were from different commits or versions.`);
      log.warn(`This release will resync both platforms.`);
    }
  } catch (e) {
    log.warn(`Could not run drift check: ${e.message}`);
  }
}

function bumpVersion(args) {
  log.step('3. Version bump');
  const pkg = JSON.parse(readFileSync(PKG_PATH, 'utf8'));
  const current = pkg.version;
  const next = nextVersion(current, args);
  log.info(`${current} → ${ANSI.bold}${next}${ANSI.reset}`);

  if (args.dryRun) {
    log.warn('--dry-run: skipping package.json write');
    return next;
  }

  pkg.version = next;
  writeFileSync(PKG_PATH, JSON.stringify(pkg, null, 2) + '\n');
  log.ok(`package.json bumped to ${next}`);
  return next;
}

function commitAndTag(version, args) {
  log.step('4. Commit and tag');
  const tag = `mobile-v${version}`;
  if (args.dryRun) {
    log.warn(`--dry-run: would commit + tag ${tag}`);
    return tag;
  }

  shStream('git', ['add', PKG_PATH]);
  shStream('git', ['commit', '-m', `chore(mobile): release v${version}`]);
  shStream('git', ['tag', '-a', tag, '-m', `Mobile release v${version}`]);
  log.ok(`Committed and tagged ${tag}`);

  log.info('Pushing commit and tag to origin...');
  shStream('git', ['push', 'origin', 'HEAD']);
  shStream('git', ['push', 'origin', tag]);
  log.ok('Pushed');
  return tag;
}

function buildPlatform(platform, args) {
  const flag = args.noSubmit ? '' : ' --auto-submit';
  log.step(`5. Build ${platform.toUpperCase()} (--profile production --local${flag ? ' --auto-submit' : ''})`);
  if (args.dryRun) {
    log.warn(`--dry-run: skipping ${platform} build`);
    return;
  }
  const easArgs = ['build', '--profile', 'production', '--platform', platform, '--local', '--non-interactive'];
  if (!args.noSubmit) easArgs.push('--auto-submit');
  shStream('eas', easArgs, { cwd: APP_DIR });
  log.ok(`${platform} build finished`);
}

function main() {
  process.chdir(APP_DIR);
  const args = parseArgs(process.argv.slice(2));

  console.log(`${ANSI.bold}PTP Mobile Release${ANSI.reset}`);
  console.log(`${ANSI.dim}Working dir: ${APP_DIR}${ANSI.reset}`);
  if (args.dryRun) log.warn('DRY RUN — no changes will be made.');

  checkPreflight();
  if (!args.skipDriftCheck) checkDriftFromLastRelease();
  const next = bumpVersion(args);
  commitAndTag(next, args);

  if (args.iosOnly) {
    buildPlatform('ios', args);
  } else if (args.androidOnly) {
    buildPlatform('android', args);
  } else {
    buildPlatform('ios', args);
    buildPlatform('android', args);
  }

  log.step('Done');
  log.ok(`Released mobile v${next} from commit ${sh('git rev-parse HEAD').slice(0, 7)}`);
  if (!args.noSubmit && !args.dryRun) {
    log.info('Builds were auto-submitted to their respective stores. Track status:');
    console.log(`  iOS:     https://appstoreconnect.apple.com/`);
    console.log(`  Android: https://play.google.com/console/`);
  }
}

main();
