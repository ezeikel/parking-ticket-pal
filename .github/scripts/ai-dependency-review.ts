import Anthropic from "@anthropic-ai/sdk";
import { execSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";

const OUTPUT_FILE = "/tmp/ai-review-comment.md";

interface PackageUpdate {
  name: string;
  from: string;
  to: string;
  workspace: string;
}

function parseArgs(): { diffFile: string; prTitle: string } {
  const args = process.argv.slice(2);
  let diffFile = "";
  let prTitle = "";

  for (const arg of args) {
    if (arg.startsWith("--diff-file=")) diffFile = arg.split("=")[1];
    if (arg.startsWith("--pr-title=")) prTitle = arg.split("=", 2)[1];
  }

  if (!diffFile) {
    console.error("Usage: ai-dependency-review.ts --diff-file=<path> --pr-title=<title>");
    process.exit(1);
  }

  return { diffFile, prTitle };
}

function parseDiff(diffContent: string): PackageUpdate[] {
  const updates: PackageUpdate[] = [];
  let currentFile = "";

  for (const line of diffContent.split("\n")) {
    // Track which package.json we're in
    if (line.startsWith("diff --git")) {
      const match = line.match(/b\/(.+\/package\.json)/);
      if (match) currentFile = match[1];
      continue;
    }

    // Look for version changes: -    "package": "^1.0.0"  →  +    "package": "^2.0.0"
    if (line.startsWith("-") && !line.startsWith("---")) {
      const depMatch = line.match(/^\-\s+"([^"]+)":\s+"[\^~]?([^"]+)"/);
      if (depMatch) {
        const [, name, fromVersion] = depMatch;
        // Skip non-version lines
        if (name === "name" || name === "version" || name === "description") continue;
        updates.push({
          name,
          from: fromVersion,
          to: "", // filled in next
          workspace: currentFile.replace("/package.json", ""),
        });
      }
    }

    if (line.startsWith("+") && !line.startsWith("+++")) {
      const depMatch = line.match(/^\+\s+"([^"]+)":\s+"[\^~]?([^"]+)"/);
      if (depMatch) {
        const [, name, toVersion] = depMatch;
        // Find the matching removal
        const pending = updates.find((u) => u.name === name && u.to === "");
        if (pending) {
          pending.to = toVersion;
        }
      }
    }
  }

  // Filter out entries where we didn't find both old and new versions
  return updates.filter((u) => u.from && u.to && u.from !== u.to);
}

function fetchChangelog(pkg: string, fromVersion: string, toVersion: string): string {
  try {
    // Try to get the repository URL from npm
    const npmInfo = execSync(`npm view ${pkg} repository.url --json 2>/dev/null`, {
      encoding: "utf-8",
      timeout: 10000,
    }).trim();

    const repoUrl = JSON.parse(npmInfo) as string;

    if (repoUrl && repoUrl.includes("github.com")) {
      // Extract owner/repo from GitHub URL
      const ghMatch = repoUrl.match(/github\.com[:/]([^/]+\/[^/.]+)/);
      if (ghMatch) {
        const repo = ghMatch[1];
        try {
          // Fetch the latest release notes
          const release = execSync(
            `gh api repos/${repo}/releases/latest --jq '.body' 2>/dev/null | head -100`,
            { encoding: "utf-8", timeout: 10000 }
          ).trim();

          if (release) return release.substring(0, 2000);
        } catch {
          // gh CLI not available or rate limited
        }
      }
    }
  } catch {
    // npm view failed
  }

  // Fallback: just get the description
  try {
    const desc = execSync(`npm view ${pkg}@${toVersion} description 2>/dev/null`, {
      encoding: "utf-8",
      timeout: 10000,
    }).trim();
    return desc || "No changelog available.";
  } catch {
    return "No changelog available.";
  }
}

async function getAIAssessment(
  updates: PackageUpdate[],
  changelogs: Map<string, string>,
  prTitle: string
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return "**AI Review unavailable** — `ANTHROPIC_API_KEY` not set.";
  }

  const client = new Anthropic({ apiKey });

  const updateSummary = updates
    .map((u) => {
      const changelog = changelogs.get(u.name) || "No changelog available.";
      return `- **${u.name}**: ${u.from} → ${u.to} (${u.workspace})\n  Changelog: ${changelog}`;
    })
    .join("\n\n");

  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: `You are reviewing dependency upgrades for a pnpm monorepo with:
- Next.js web app (apps/web)
- Expo SDK 55 / React Native 0.83 mobile app (apps/mobile)
- Browser extension (apps/extension)
- Shared packages: db (Prisma), constants, types

PR Title: ${prTitle}

The following packages are being updated:

${updateSummary}

For each package, provide:
1. **Risk**: low / medium / high
2. **Breaking changes** relevant to this project (if any)
3. **Affected**: which apps/packages
4. **Native impact**: does this need iOS/Android rebuild?
5. **Migration**: any code changes needed beyond the version bump

Then provide an overall **Recommendation**: safe-to-merge / merge-with-caution / needs-manual-review

Format your response as a markdown table followed by a summary paragraph. Be concise — focus on what matters. If all updates are low-risk patches, say so briefly.`,
      },
    ],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  return textBlock?.text || "AI assessment returned no content.";
}

async function main() {
  const { diffFile, prTitle } = parseArgs();

  const diffContent = readFileSync(diffFile, "utf-8");
  if (!diffContent.trim()) {
    writeFileSync(OUTPUT_FILE, "No package.json changes detected in this PR.\n");
    return;
  }

  const updates = parseDiff(diffContent);
  if (updates.length === 0) {
    writeFileSync(OUTPUT_FILE, "No version changes detected in package.json files.\n");
    return;
  }

  console.log(`Found ${updates.length} package updates. Fetching changelogs...`);

  // Fetch changelogs for unique packages
  const changelogs = new Map<string, string>();
  const seen = new Set<string>();
  for (const update of updates) {
    if (seen.has(update.name)) continue;
    seen.add(update.name);
    console.log(`  Fetching changelog for ${update.name}...`);
    changelogs.set(update.name, fetchChangelog(update.name, update.from, update.to));
  }

  console.log("Running AI assessment...");
  const assessment = await getAIAssessment(updates, changelogs, prTitle);

  const comment = `## 🤖 AI Dependency Review

${assessment}

---
<sub>Generated by AI dependency review — verify critical changes manually.</sub>
`;

  writeFileSync(OUTPUT_FILE, comment);
  console.log(`Review written to ${OUTPUT_FILE}`);
}

main().catch((err) => {
  console.error("AI dependency review failed:", err);
  // Don't fail the workflow — write a fallback comment
  writeFileSync(
    OUTPUT_FILE,
    `## 🤖 AI Dependency Review

**Review failed** — ${err instanceof Error ? err.message : "Unknown error"}

Please review the package changes manually.

---
<sub>Generated by AI dependency review.</sub>
`
  );
});
