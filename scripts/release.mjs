/** Versioned, branch-safe release. No --force, no branch switching, no credentials in archives. */
import { spawnSync } from "node:child_process";
import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  statSync,
} from "node:fs";
import { resolve, basename } from "node:path";
import { createHash } from "node:crypto";
const args = process.argv.slice(2),
  publishing = args.includes("--publish"),
  connector = args.includes("--drive=connector"),
  resume = args.includes("--resume");
const run = (cmd, argv, opts = {}) => {
  const r = spawnSync(cmd, argv, {
    stdio: "inherit",
    encoding: "utf8",
    ...opts,
  });
  if (r.error) throw r.error;
  if (r.status !== 0)
    throw Error(
      `${cmd} ${argv[0]} failed (${r.status}). No success is being reported.`,
    );
  return r.stdout?.trim() || "";
};
const output = (cmd, argv) =>
  run(cmd, argv, { stdio: ["ignore", "pipe", "inherit"] });
const git = (...a) => output("git", a);
const gh = (...a) => output("gh", a);
const branch = git("branch", "--show-current");
if (!branch || branch === "main" || branch === "master")
  throw Error(
    "Run on the current working branch, not the default branch or detached HEAD.",
  );
if (process.env.RELEASE_BRANCH && branch !== process.env.RELEASE_BRANCH)
  throw Error("Current branch differs from RELEASE_BRANCH");
const next = args.find((a) => a.startsWith("--version="))?.slice(10);
if (next) {
  if (!/^\d+\.\d+\.\d+$/.test(next))
    throw Error("Use a numeric SemVer release.");
  run("npm", ["version", next, "--no-git-tag-version", "--ignore-scripts"]);
}
const pkg = JSON.parse(readFileSync("package.json", "utf8")),
  tag = "v" + pkg.version,
  notes = readFileSync("RELEASE_NOTES.md", "utf8");
if (
  !/^v\d+\.\d+\.\d+$/.test(tag) ||
  !readFileSync("CHANGELOG.md", "utf8").includes("## " + tag + " ") ||
  !notes.includes(tag)
)
  throw Error(
    "Align the package version, changelog and release notes before release.",
  );
const sourceRoots = [
  ".cursorrules",
  ".prettierignore",
  ".gitignore",
  ".env.example",
  "AGENTS.md",
  "PROJECT_MEMORY.md",
  "README.md",
  "CHANGELOG.md",
  "RELEASE_NOTES.md",
  "LICENSE",
  "package.json",
  "package-lock.json",
  "vite.config.ts",
  "tsconfig.json",
  "index.html",
  "public",
  "src",
  "server",
  "scripts",
  "tests",
];
const allowed = (p) =>
  sourceRoots.some((r) => p === r || p.startsWith(r + "/")) &&
  !/(^|\/)(\.env(\.|$)(?!example$)|node_modules\/|\.git\/|[^/]*\.(pem|p12|key|zip)$)/.test(
    p,
  );
if (
  git("diff", "--cached", "--name-only")
    .split("\n")
    .filter(Boolean)
    .some((p) => !allowed(p))
)
  throw Error("Unexpected staged paths. Review staging before releasing.");
const remote = process.env.DRIVE_REMOTE;
if (publishing && !connector) {
  if (!remote || !/^[\w.-]+$/.test(remote))
    throw Error(
      "Set DRIVE_REMOTE to a configured rclone remote, or use --drive=connector in Arena.",
    );
  run("rclone", ["version"]);
}
const remoteTag = publishing
  ? git(
      "ls-remote",
      "--tags",
      "origin",
      `refs/tags/${tag}`,
      `refs/tags/${tag}^{}`,
    )
  : "";
if (
  remoteTag &&
  (!resume ||
    git("status", "--porcelain") ||
    !remoteTag.includes(git("rev-parse", "HEAD")))
)
  throw Error(
    `${tag} already exists. Never overwrite it; bump SemVer, or --resume the same clean commit.`,
  );
run("npm", ["run", "verify"]); // Every release commit is gated by the entire verification suite.
const dir = resolve(".release", tag);
mkdirSync(dir, { recursive: true });
const artifact = resolve(dir, `dist-${tag}.zip`),
  source = resolve(dir, `source-${tag}.zip`),
  telemetry = resolve(dir, "smoke.json");
const newZip = (dest, argv, options) => {
  if (existsSync(dest)) run("rm", ["-f", "--", dest]);
  run("zip", ["-q", "-X", "-9", ...argv], options);
};
newZip(artifact, ["-r", artifact, "."], { cwd: resolve("dist") });
writeFileSync(telemetry, readFileSync(".release/smoke.json"));
let commit = git("rev-parse", "HEAD");
if (publishing) {
  run("git", ["add", "-A", "--", ...sourceRoots]);
  const tree = git("ls-files").split("\n");
  if (tree.some((p) => !allowed(p)))
    throw Error("Unexpected tracked source. Review the archive allowlist.");
  if (git("diff", "--cached", "--name-only")) {
    run("git", [
      "commit",
      "-m",
      `release(${tag}): ${pkg.name} playable milestone`,
      "-m",
      notes,
    ]);
  }
  commit = git("rev-parse", "HEAD");
  if (git("branch", "--show-current") !== branch)
    throw Error("Branch changed during verification");
  run("git", [
    "archive",
    "--format=zip",
    `--prefix=vice-leonida-${tag}/`,
    `--output=${source}`,
    commit,
  ]);
} else {
  const files = output("git", [
    "ls-files",
    "--cached",
    "--others",
    "--exclude-standard",
  ])
    .split("\n")
    .filter((p) => allowed(p) && existsSync(p));
  if (!files.length) throw Error("No source files");
  newZip(source, [source, "-@"], {
    input: files.join("\n") + "\n",
    stdio: ["pipe", "inherit", "inherit"],
  });
}
const files = [artifact, source, telemetry];
const checksum = resolve(dir, "SHA256SUMS");
writeFileSync(
  checksum,
  files
    .map(
      (f) =>
        createHash("sha256").update(readFileSync(f)).digest("hex") +
        "  " +
        basename(f),
    )
    .join("\n") + "\n",
);
files.push(checksum);
for (const f of files) console.log(basename(f), statSync(f).size, "bytes");
if (publishing) {
  run("git", ["push", "origin", branch]); // The only git push: always the exact working branch.
  if (!remoteTag) {
    const repo = gh(
      "repo",
      "view",
      "--json",
      "nameWithOwner",
      "--jq",
      ".nameWithOwner",
    );
    const ref = gh(
      "api",
      "-X",
      "POST",
      `repos/${repo}/git/tags`,
      "-f",
      `tag=${tag}`,
      "-f",
      `message=${tag}: ${pkg.name} verified milestone`,
      "-f",
      `object=${commit}`,
      "-f",
      "type=commit",
      "--jq",
      ".sha",
    );
    if (!/^[a-f0-9]{40}$/.test(ref))
      throw Error("Invalid annotated tag response");
    gh(
      "api",
      "-X",
      "POST",
      `repos/${repo}/git/refs`,
      "-f",
      `ref=refs/tags/${tag}`,
      "-f",
      `sha=${ref}`,
    );
    run("git", ["fetch", "origin", "tag", tag]);
  }
  if (!connector)
    for (const f of files)
      run("rclone", [
        "copyto",
        "--immutable",
        "--checksum",
        f,
        `${remote}:projects/game/gta6-clone/${tag}/${basename(f)}`,
      ]);
  else
    console.log(
      `Drive handoff pending: upload ${dir} files under projects/game/gta6-clone/${tag}/ via the enabled connector.`,
    );
  run("gh", [
    "release",
    "create",
    tag,
    ...files,
    "--verify-tag",
    "--target",
    commit,
    "--title",
    tag,
    "--notes-file",
    "RELEASE_NOTES.md",
  ]);
  console.log(
    "Published",
    gh("release", "view", tag, "--json", "url", "--jq", ".url"),
    "at",
    commit,
  );
} else
  console.log(
    "Local verification and packaging complete. No remote state changed.",
  );
