import { loadAudioConfig, readApiKey } from "./config.mjs";

const inflight = new Map();

function providerMessage(status, bodyText) {
  let code = "";
  let message = bodyText.slice(0, 500);
  try {
    const json = JSON.parse(bodyText);
    const detail = json.detail;
    if (typeof detail === "string") message = detail;
    else if (detail && typeof detail === "object") {
      code = String(detail.code || detail.status || "");
      message = String(detail.message || message);
    } else if (typeof json.message === "string") {
      message = json.message;
    }
  } catch {
    // Keep a short raw snippet; never include request headers or the key.
  }
  return ["ElevenLabs HTTP " + status, code, message]
    .filter(Boolean)
    .join(": ");
}

function redact(message, apiKey) {
  if (!apiKey || !message) return message;
  return message.split(apiKey).join("[redacted]");
}

async function requestSpeech(
  { text, voiceId, modelId, outputFormat, voiceSettings },
  fetchImpl,
) {
  const apiKey = readApiKey();
  if (!apiKey.trim()) {
    throw new Error("ElevenLabs API key is not configured.");
  }
  const url =
    "https://api.elevenlabs.io/v1/text-to-speech/" +
    encodeURIComponent(voiceId) +
    "/with-timestamps?output_format=" +
    encodeURIComponent(outputFormat);
  const response = await fetchImpl(url, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      text,
      model_id: modelId,
      voice_settings: voiceSettings,
    }),
  });
  const bodyText = await response.text();
  if (!response.ok) {
    throw new Error(redact(providerMessage(response.status, bodyText), apiKey));
  }
  let json;
  try {
    json = JSON.parse(bodyText);
  } catch {
    throw new Error("ElevenLabs returned a malformed response");
  }
  if (typeof json.audio_base64 !== "string" || !json.alignment) {
    throw new Error("ElevenLabs returned a malformed response");
  }
  return {
    audio: Buffer.from(json.audio_base64, "base64"),
    alignment: json.alignment,
  };
}

/**
 * POST /v1/text-to-speech/{voice_id}/with-timestamps.
 * Uses response.alignment (not normalized_alignment). `fetch` is injectable.
 */
export async function synthesizeSpeech(
  input,
  { fetch: fetchImpl = globalThis.fetch } = {},
) {
  const config = input.config ?? (await loadAudioConfig());
  const payload = {
    text: input.text,
    voiceId: input.voiceId ?? config.voiceId,
    modelId: input.modelId ?? config.modelId,
    outputFormat: input.outputFormat ?? config.outputFormat,
    voiceSettings: input.voiceSettings ?? config.voiceSettings,
  };
  const key = input.segmentId || payload.text;
  if (inflight.has(key)) return inflight.get(key);
  const pending = requestSpeech(payload, fetchImpl).finally(() =>
    inflight.delete(key),
  );
  inflight.set(key, pending);
  return pending;
}
