import { createInterface } from "node:readline";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveAlignment } from "../src/server/audio/align.mjs";
import { loadAudioConfig } from "../src/server/audio/config.mjs";
import { synthesizeSpeech } from "../src/server/audio/elevenlabs.mjs";
import {
  listVersions,
  readMetadata,
  updateReview,
  writeVersion,
} from "../src/server/audio/library.mjs";
import { buildPlan } from "../src/server/audio/plan.mjs";
import {
  findSegmentById,
  loadPageSegments,
} from "../src/server/audio/segments.mjs";

export { buildPlan };

const inflight = new Map();

export function usage() {
  return `Usage:
  npm run audio -- plan [--page nutrients]
  npm run audio -- generate [--page nutrients] [--only id1,id2] [--retry-rejected] [--yes]
  npm run audio -- review <segmentId> <hash> approve|reject [reason]
  npm run audio -- list [--page nutrients]`;
}

export function parseArgs(argv) {
  const flags = {
    page: "nutrients",
    only: null,
    yes: false,
    retryRejected: false,
    positional: [],
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--page") flags.page = argv[++i];
    else if (arg.startsWith("--page=")) flags.page = arg.slice(7);
    else if (arg === "--only") flags.only = argv[++i];
    else if (arg.startsWith("--only=")) flags.only = arg.slice(7);
    else if (arg === "--yes" || arg === "-y") flags.yes = true;
    else if (arg === "--retry-rejected") flags.retryRejected = true;
    else if (arg === "--help" || arg === "-h") flags.help = true;
    else flags.positional.push(arg);
  }
  if (typeof flags.only === "string") {
    flags.only = flags.only
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
  }
  return flags;
}

export function printPlan(plan) {
  let rejected = 0;
  for (const row of plan.rows) {
    const bits = [
      row.id,
      row.retry ? "retry" : row.status,
      `chars=${row.characters}`,
      `hash=${row.hash}`,
    ];
    if (row.protected) bits.push("protected");
    if (row.status === "rejected" && row.reason) {
      bits.push(`reason=${row.reason}`);
    }
    if (row.status === "rejected") rejected += 1;
    console.log(bits.join("  "));
  }
  console.log(`needed_segments=${plan.needed.length}`);
  console.log(`needed_characters=${plan.neededCharacters}`);
  if (rejected) {
    console.log("hint: use --retry-rejected to regenerate rejected clips");
  }
}

async function confirm(prompt) {
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  try {
    const answer = await new Promise((resolve) => rl.question(prompt, resolve));
    return /^y(es)?$/i.test(String(answer).trim());
  } finally {
    rl.close();
  }
}

export async function generateOne(row, config, { fetch } = {}) {
  const id = row.segment.id;
  const libraryPath = config.libraryPath;
  if (inflight.has(id)) return inflight.get(id);
  const pending = (async () => {
    const existing = await readMetadata(row.segment.page, id, row.hash, {
      libraryPath,
    });
    if (existing?.review?.status === "approved") {
      throw new Error("Refusing to overwrite an approved clip");
    }
    if (existing && existing.review?.status !== "rejected") {
      throw new Error("Clip already exists for this hash");
    }
    const { audio, alignment } = await synthesizeSpeech(
      {
        text: row.segment.text,
        segmentId: id,
        config,
      },
      fetch ? { fetch } : {},
    );
    const latest = await readMetadata(row.segment.page, id, row.hash, {
      libraryPath,
    });
    if (latest?.review?.status === "approved") {
      throw new Error("Refusing to overwrite an approved clip");
    }
    const prior = latest ?? existing;
    const previousReviews = prior?.review
      ? [...(prior.previousReviews ?? []), prior.review]
      : prior?.previousReviews;
    const resolved = resolveAlignment(
      row.segment.text,
      alignment,
      row.segment.cues,
    );
    await writeVersion({
      audio,
      alignment: resolved,
      libraryPath,
      metadata: {
        segmentId: row.segment.id,
        page: row.segment.page,
        part: row.segment.part,
        version: row.segment.version,
        text: row.segment.text,
        hash: row.hash,
        voiceId: config.voiceId,
        modelId: config.modelId,
        voiceSettings: config.voiceSettings,
        outputFormat: config.outputFormat,
        characters: row.segment.text.length,
        createdAt: new Date().toISOString(),
        ...(row.segment.protected ? { protected: row.segment.protected } : {}),
        review: { status: "pending" },
        ...(previousReviews?.length ? { previousReviews } : {}),
      },
    });
  })();
  inflight.set(id, pending);
  try {
    await pending;
  } finally {
    inflight.delete(id);
  }
}

async function runPlan(page) {
  printPlan(await buildPlan(page));
}

async function runGenerate({ page, only, yes, retryRejected }) {
  const config = await loadAudioConfig();
  if (!config.hasApiKey) {
    console.error("Refuse: ELEVENLABS_API_KEY is not set.");
    process.exitCode = 1;
    return;
  }
  if (!config.voiceId) {
    console.error("Refuse: ELEVENLABS_VOICE_ID is not set.");
    process.exitCode = 1;
    return;
  }
  if (config.maxCharacters == null) {
    console.error("Refuse: ELEVENLABS_MAX_CHARACTERS is not set.");
    process.exitCode = 1;
    return;
  }
  const plan = await buildPlan(page, only, {
    retryRejected: Boolean(retryRejected),
  });
  printPlan(plan);
  if (plan.neededCharacters > config.maxCharacters) {
    console.error(
      `Abort: needed_characters=${plan.neededCharacters} exceeds ELEVENLABS_MAX_CHARACTERS=${config.maxCharacters}. No requests sent.`,
    );
    process.exitCode = 1;
    return;
  }
  if (plan.needed.length === 0) {
    console.log("Nothing to generate.");
    return;
  }
  if (!yes) {
    const ok = await confirm("Generate these clips? [y/N] ");
    if (!ok) {
      console.error("Cancelled. No requests sent.");
      process.exitCode = 1;
      return;
    }
  }
  const failures = [];
  let succeeded = 0;
  for (const row of plan.needed) {
    try {
      await generateOne(row, config);
      succeeded += 1;
      console.log(`generated  ${row.id}  ${row.hash}  pending`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push({ id: row.id, message });
      console.error(`FAIL  ${row.id}: ${message}`);
    }
  }
  console.log(`Succeeded: ${succeeded}. Failed: ${failures.length}.`);
  if (failures.length) process.exitCode = 1;
}

async function runReview(segmentId, hash, decision, reason) {
  if (!segmentId || !hash || !decision) {
    console.error(usage());
    process.exitCode = 1;
    return;
  }
  if (decision !== "approve" && decision !== "reject") {
    console.error("Decision must be approve or reject.");
    process.exitCode = 1;
    return;
  }
  const segment = await findSegmentById(segmentId);
  if (!segment) {
    console.error(`Unknown segment: ${segmentId}`);
    process.exitCode = 1;
    return;
  }
  const status = decision === "approve" ? "approved" : "rejected";
  const metadata = await updateReview(segment.page, segmentId, hash, {
    status,
    reason,
  });
  console.log(
    [metadata.segmentId, metadata.hash, metadata.review.status].join("  "),
  );
}

async function runList(page) {
  const segments = await loadPageSegments(page);
  for (const segment of segments) {
    const versions = await listVersions(segment.page, segment.id);
    if (!versions.length) {
      console.log(`${segment.id}  (no versions)`);
      continue;
    }
    for (const version of versions) {
      console.log(
        [
          segment.id,
          version.hash,
          version.review?.status ?? "unknown",
          version.createdAt ?? "",
        ].join("  "),
      );
    }
  }
}

function runningAsCli() {
  const entry = process.argv[1];
  if (!entry) return false;
  return (
    resolve(fileURLToPath(import.meta.url)).toLowerCase() ===
    resolve(entry).toLowerCase()
  );
}

if (runningAsCli()) {
  const flags = parseArgs(process.argv.slice(2));
  const command = flags.positional[0];
  if (!command || flags.help) {
    console.error(usage());
    process.exitCode = command ? 0 : 1;
  } else if (command === "plan") {
    await runPlan(flags.page);
  } else if (command === "generate") {
    await runGenerate(flags);
  } else if (command === "review") {
    const [, segmentId, hash, decision, ...reasonParts] = flags.positional;
    await runReview(segmentId, hash, decision, reasonParts.join(" ").trim());
  } else if (command === "list") {
    await runList(flags.page);
  } else {
    console.error(usage());
    process.exitCode = 1;
  }
}
