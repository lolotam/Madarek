import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);
export const RECORDING_BYTES = 44 + 16_000 * 2 * 12;
let active = 0;
const runtime = globalThis;
const fingerprint = (wav) => createHash("sha256").update(wav).digest("hex");
const receiptSignature = (encoded) =>
  createHmac(
    "sha256",
    (runtime.__madarekSpellingReceiptKey ??= randomBytes(32)),
  )
    .update(encoded)
    .digest("base64url");

export function spellingReceipt(context, wav, result) {
  const payload = Buffer.from(
    JSON.stringify({
      ...context,
      ...result,
      hash: fingerprint(wav),
      expires: Date.now() + 10 * 60_000,
    }),
  ).toString("base64url");
  return payload + "." + receiptSignature(payload);
}

export function readSpellingReceipt(token, context, wav) {
  if (
    typeof token !== "string" ||
    token.length > 1900 ||
    !/^[\w-]+\.[\w-]+$/.test(token)
  )
    throw error("أعد تفريغ التسجيل قبل الحفظ.", 409);
  const [payload, sent] = token.split(".");
  const expected = receiptSignature(payload);
  if (
    sent.length !== expected.length ||
    !timingSafeEqual(Buffer.from(sent), Buffer.from(expected))
  )
    throw error("أعد تفريغ التسجيل قبل الحفظ.", 409);
  const record = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  if (
    record.expires <= Date.now() ||
    record.uid !== context.uid ||
    record.qid !== context.qid ||
    record.nonce !== context.nonce ||
    record.hash !== fingerprint(wav)
  )
    throw error("أعد تفريغ التسجيل قبل الحفظ.", 409);
  return { transcript: record.transcript, answer: record.answer };
}

function error(message, status) {
  return Object.assign(new Error(message), { status });
}

export function validateSpellingWav(bytes) {
  if (
    bytes.length < 44 + 16_000 ||
    bytes.length > RECORDING_BYTES ||
    bytes.length % 2 ||
    bytes.toString("ascii", 0, 4) !== "RIFF" ||
    bytes.readUInt32LE(4) !== bytes.length - 8 ||
    bytes.toString("ascii", 8, 16) !== "WAVEfmt " ||
    bytes.readUInt32LE(16) !== 16 ||
    bytes.readUInt16LE(20) !== 1 ||
    bytes.readUInt16LE(22) !== 1 ||
    bytes.readUInt32LE(24) !== 16_000 ||
    bytes.readUInt32LE(28) !== 32_000 ||
    bytes.readUInt16LE(32) !== 2 ||
    bytes.readUInt16LE(34) !== 16 ||
    bytes.toString("ascii", 36, 40) !== "data" ||
    bytes.readUInt32LE(40) !== bytes.length - 44
  )
    throw error("سجّل إجابة صوتية واضحة مدتها من نصف ثانية إلى ١٢ ثانية.", 400);
  let peak = 0;
  let energy = 0;
  for (let index = 44; index < bytes.length; index += 2) {
    const sample = bytes.readInt16LE(index);
    peak = Math.max(peak, Math.abs(sample));
    energy += sample * sample;
  }
  if (peak < 135 || Math.sqrt(energy / ((bytes.length - 44) / 2)) < 35)
    throw error("الصوت منخفض. قرّب الميكروفون وجرّب تاني.", 422);
}

const letterNames = {
  ay: "a",
  bee: "b",
  cee: "c",
  see: "c",
  sea: "c",
  dee: "d",
  ee: "e",
  ef: "f",
  eff: "f",
  gee: "g",
  aitch: "h",
  haitch: "h",
  eye: "i",
  jay: "j",
  kay: "k",
  el: "l",
  ell: "l",
  em: "m",
  en: "n",
  oh: "o",
  pee: "p",
  cue: "q",
  queue: "q",
  ar: "r",
  ess: "s",
  es: "s",
  tee: "t",
  you: "u",
  vee: "v",
  ex: "x",
  why: "y",
  zed: "z",
  zee: "z",
};

export function spellingAnswer(transcript) {
  const words =
    transcript
      .toLowerCase()
      .replace(/\bdouble[ -]+(?:u|you)\b/g, " w ")
      .replace(/^(?:the word is|i spell)\s+/i, "")
      .match(/[a-z]+/g) ?? [];
  if (
    words.length >= 2 &&
    words.every((word) => word.length === 1 || Object.hasOwn(letterNames, word))
  )
    return words.map((word) => letterNames[word] ?? word).join("");
  return words.join(" ");
}

export async function transcribeSpelling(wav) {
  validateSpellingWav(wav);
  const model = process.env.ENGLISH_WHISPER_MODEL;
  const binary = process.env.ENGLISH_WHISPER_BIN || "whisper-cli";
  if (!model) throw error("التفريغ الصوتي غير متاح حاليًا. اكتب إجابتك.", 503);
  if (active >= 2)
    throw error("التفريغ مشغول. جرّب إرسال التسجيل مرة تانية.", 429);
  active++;
  let directory;
  try {
    directory = await mkdtemp(join(tmpdir(), "madarek-spelling-"));
    const input = join(directory, "answer.wav");
    const output = join(directory, "heard");
    await writeFile(input, wav, { mode: 0o600 });
    await run(
      binary,
      [
        "-m",
        model,
        "-f",
        input,
        "-l",
        "en",
        "-nt",
        "-np",
        "-t",
        "2",
        "--no-fallback",
        "--temperature",
        "0",
        "--prompt",
        "The pupil spells a word aloud, one English letter at a time. Transcribe the spoken letters verbatim, separated by spaces.",
        "-otxt",
        "-of",
        output,
      ],
      { timeout: 25_000, windowsHide: true, maxBuffer: 256_000 },
    );
    const transcript = (await readFile(output + ".txt", "utf8")).trim();
    const answer = spellingAnswer(transcript);
    if (!answer || !transcript || transcript.length > 200)
      throw error("ما قدرناش نسمع الحروف بوضوح. جرّب التسجيل تاني.", 422);
    return { transcript, answer };
  } catch (failure) {
    if (failure.status) throw failure;
    throw error("تعذّر تفريغ التسجيل. حاول مرة تانية أو اكتب إجابتك.", 503);
  } finally {
    active--;
    if (directory) await rm(directory, { recursive: true, force: true });
  }
}
