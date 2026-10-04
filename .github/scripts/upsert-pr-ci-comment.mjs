#!/usr/bin/env node

const repository = process.env.GITHUB_REPOSITORY;
const pullRequest = process.env.JUMPRUN_PR_NUMBER;
const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
const phase = process.env.JUMPRUN_COMMENT_PHASE;
const runId = process.env.JUMPRUN_RUN_ID;
const runUrl = process.env.JUMPRUN_RUN_URL;
const buildResult = process.env.JUMPRUN_BUILD_RESULT;
const dryRun = process.env.JUMPRUN_COMMENT_DRY_RUN === "true";

if (!repository || !pullRequest || !phase || !runId || !runUrl || (!token && !dryRun)) {
  throw new Error("Missing JumpRun PR CI comment context.");
}
if (!/^\d+$/.test(pullRequest) || !/^\d+$/.test(runId)) {
  throw new Error("JumpRun PR number and run ID must be numeric.");
}
if (!["started", "final"].includes(phase)) {
  throw new Error(`Unsupported JumpRun PR CI comment phase: ${phase}`);
}
if (phase === "final" && !buildResult) {
  throw new Error("Missing JumpRun build result for the final comment.");
}

const repositoryParts = repository.split("/");
if (repositoryParts.length !== 2 || repositoryParts.some((part) => !part)) {
  throw new Error(`Invalid GITHUB_REPOSITORY: ${repository}`);
}
const [owner, repo] = repositoryParts;

const markerName = "jumprun-ci-status";
const markerPrefix = `<!-- ${markerName} `;
const marker = `${markerPrefix}run-id=${runId} -->`;
const apiRoot = process.env.GITHUB_API_URL || "https://api.github.com";
const commentsUrl = `${apiRoot}/repos/${owner}/${repo}/issues/${pullRequest}/comments`;

const resultIcon = (result) => {
  if (result === "success") return "✅";
  if (result === "skipped") return "⏭️";
  if (["failure", "cancelled", "timed_out", "action_required", "startup_failure"].includes(result)) {
    return "❌";
  }
  return "⏳";
};

const renderComment = () => {
  const lines = [marker, "## JumpRun PR CI", "", `- Run: [Actions log](${runUrl})`];
  if (phase === "started") {
    lines.push("- Build and tests: ⏳ pending", "", "CI validation has started.");
  } else {
    lines.push(`- Build and tests: ${resultIcon(buildResult)} ${buildResult}`);
    lines.push("", buildResult === "success"
      ? "**CI completed successfully.**"
      : `**CI failed.** Review the [Actions log](${runUrl}).`);
  }
  return lines.join("\n");
};

const body = renderComment();
if (dryRun) {
  console.log(body);
  process.exit(0);
}

const headers = {
  Accept: "application/vnd.github+json",
  Authorization: `Bearer ${token}`,
  "X-GitHub-Api-Version": "2022-11-28",
  "Content-Type": "application/json",
};

const request = async (url, options = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: { ...headers, ...options.headers },
  });
  if (!response.ok) {
    throw new Error(
      `GitHub API ${options.method || "GET"} ${url} failed: ${response.status} ${await response.text()}`,
    );
  }
  return {
    data: response.status === 204 ? undefined : await response.json(),
    link: response.headers.get("link"),
  };
};

const nextPage = (linkHeader) => {
  if (!linkHeader) return undefined;
  const next = linkHeader.split(",").find((link) => link.includes('rel="next"'));
  return next?.match(/<([^>]+)>/)?.[1];
};

let existing;
let pageUrl = `${commentsUrl}?per_page=100`;
while (pageUrl && !existing) {
  const page = await request(pageUrl);
  existing = page.data.find(
    (comment) => comment.user?.login === "github-actions[bot]"
      && comment.body?.includes(markerPrefix),
  );
  pageUrl = nextPage(page.link);
}

if (existing) {
  const existingRunId = existing.body.match(
    new RegExp(`<!-- ${markerName} run-id=(\\d+) -->`),
  )?.[1];
  if (existingRunId && BigInt(existingRunId) > BigInt(runId)) {
    console.log(`Skipping stale run ${runId}; PR comment belongs to newer run ${existingRunId}.`);
    process.exit(0);
  }
  if (phase !== "started" && existingRunId !== runId) {
    console.log(`Skipping stale run ${runId}; PR comment belongs to run ${existingRunId || "unknown"}.`);
    process.exit(0);
  }
  await request(`${apiRoot}/repos/${owner}/${repo}/issues/comments/${existing.id}`, {
    method: "PATCH",
    body: JSON.stringify({ body }),
  });
} else {
  if (phase !== "started") {
    console.log(`Skipping final update for run ${runId}; its start comment was not found.`);
    process.exit(0);
  }
  await request(commentsUrl, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}
