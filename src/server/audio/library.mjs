import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import {
  mkdir,
  readdir,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { isAbsolute, join, relative, resolve } from "node:path";
import { loadAudioConfig } from "./config.mjs";
import { HASH_RE, assertHash, assertPageId, assertSegmentId } from "./ids.mjs";

async function libraryRoot(override) {
  return resolve(override ?? (await loadAudioConfig()).libraryPath);
}

function containedPath(root, ...parts) {
  const base = resolve(root);
  const dest = resolve(base, ...parts);
  const rel = relative(base, dest);
  if (!rel || rel.startsWith("..") || isAbsolute(rel)) {
    throw new Error("Invalid library path");
  }
  return dest;
}

function versionDir(root, page, segmentId, hash) {
  assertPageId(page);
  assertSegmentId(segmentId);
  assertHash(hash);
  return containedPath(root, page, segmentId, hash);
}

async function readJson(file) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    if (error && error.code === "ENOENT") return null;
    throw error;
  }
}

export async function writeVersion({
  audio,
  alignment,
  metadata,
  libraryPath,
}) {
  const page = assertPageId(metadata.page);
  const segmentId = assertSegmentId(metadata.segmentId);
  const hash = assertHash(metadata.hash);
  if (metadata.hash !== hash) throw new Error("Invalid clip hash");
  const root = await libraryRoot(libraryPath);
  await mkdir(root, { recursive: true });
  const dest = versionDir(root, page, segmentId, hash);
  const tmp = join(root, `.tmp-${randomUUID()}`);
  try {
    await mkdir(tmp, { recursive: true });
    await writeFile(join(tmp, "audio.mp3"), audio);
    await writeFile(
      join(tmp, "alignment.json"),
      JSON.stringify(alignment, null, 2),
    );
    await writeFile(
      join(tmp, "metadata.json"),
      JSON.stringify(metadata, null, 2),
    );
    await mkdir(containedPath(root, page, segmentId), { recursive: true });
    if (existsSync(dest)) {
      const bak = join(root, `.bak-${randomUUID()}`);
      await rename(dest, bak);
      try {
        await rename(tmp, dest);
        await rm(bak, { recursive: true, force: true });
      } catch (error) {
        if (existsSync(bak) && !existsSync(dest)) await rename(bak, dest);
        throw error;
      }
    } else {
      await rename(tmp, dest);
    }
  } catch (error) {
    await rm(tmp, { recursive: true, force: true });
    throw error;
  }
  return dest;
}

export async function listVersions(page, segmentId, { libraryPath } = {}) {
  assertPageId(page);
  assertSegmentId(segmentId);
  const root = await libraryRoot(libraryPath);
  const dir = containedPath(root, page, segmentId);
  let names;
  try {
    names = await readdir(dir);
  } catch (error) {
    if (error && error.code === "ENOENT") return [];
    throw error;
  }
  const versions = [];
  for (const name of names) {
    if (!HASH_RE.test(name)) continue;
    const metadata = await readJson(join(dir, name, "metadata.json"));
    if (metadata) versions.push(metadata);
  }
  return versions;
}

export async function pickNewestApproved(
  page,
  segmentId,
  { libraryPath } = {},
) {
  const versions = await listVersions(page, segmentId, { libraryPath });
  const approved = versions.filter(
    (version) => version?.review?.status === "approved",
  );
  approved.sort(
    (a, b) => Date.parse(b.createdAt || 0) - Date.parse(a.createdAt || 0),
  );
  return approved[0] ?? null;
}

export async function readMetadata(
  page,
  segmentId,
  hash,
  { libraryPath } = {},
) {
  const root = await libraryRoot(libraryPath);
  return readJson(
    join(versionDir(root, page, segmentId, hash), "metadata.json"),
  );
}

export async function readAlignment(
  page,
  segmentId,
  hash,
  { libraryPath } = {},
) {
  const root = await libraryRoot(libraryPath);
  return readJson(
    join(versionDir(root, page, segmentId, hash), "alignment.json"),
  );
}

export async function readAudio(page, segmentId, hash, { libraryPath } = {}) {
  const root = await libraryRoot(libraryPath);
  try {
    return await readFile(
      join(versionDir(root, page, segmentId, hash), "audio.mp3"),
    );
  } catch (error) {
    if (error && error.code === "ENOENT") return null;
    throw error;
  }
}

export async function updateReview(
  page,
  segmentId,
  hash,
  { status, reason, libraryPath } = {},
) {
  if (!["pending", "approved", "rejected"].includes(status)) {
    throw new Error("Invalid review status");
  }
  if (status === "rejected" && (typeof reason !== "string" || !reason.trim())) {
    throw new Error("A reason is required to reject a clip");
  }
  const metadata = await readMetadata(page, segmentId, hash, { libraryPath });
  if (!metadata) throw new Error("Clip version was not found");
  metadata.review = {
    status,
    reviewedAt: new Date().toISOString(),
    ...(status === "rejected" ? { reason: reason.trim() } : {}),
  };
  const root = await libraryRoot(libraryPath);
  const dir = versionDir(root, page, segmentId, hash);
  const file = join(dir, "metadata.json");
  const tmp = join(dir, `metadata.${randomUUID()}.tmp`);
  await writeFile(tmp, JSON.stringify(metadata, null, 2));
  await rename(tmp, file);
  return metadata;
}
