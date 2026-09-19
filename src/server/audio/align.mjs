function requireArrays(provider) {
  if (!provider || typeof provider !== "object") {
    throw new Error("Alignment is missing");
  }
  const characters = provider.characters;
  const starts = provider.character_start_times_seconds;
  const ends = provider.character_end_times_seconds;
  if (
    !Array.isArray(characters) ||
    !Array.isArray(starts) ||
    !Array.isArray(ends)
  ) {
    throw new Error("Alignment arrays are missing");
  }
  if (
    characters.length !== starts.length ||
    characters.length !== ends.length
  ) {
    throw new Error("Alignment arrays must be the same length");
  }
  return { characters, starts, ends };
}

function assertTimes(starts, ends) {
  let prevStart = -Infinity;
  let prevEnd = -Infinity;
  for (let i = 0; i < starts.length; i++) {
    const start = starts[i];
    const end = ends[i];
    if (
      typeof start !== "number" ||
      typeof end !== "number" ||
      Number.isNaN(start) ||
      Number.isNaN(end)
    ) {
      throw new Error("Alignment times must be numbers");
    }
    if (start < prevStart || end < prevEnd || end < start) {
      throw new Error("Alignment times must be non-decreasing");
    }
    prevStart = start;
    prevEnd = end;
  }
}

function charIndexAtStringOffset(characters, offset, asEnd) {
  let pos = 0;
  for (let i = 0; i < characters.length; i++) {
    const piece = String(characters[i]);
    const next = pos + piece.length;
    if (!asEnd && pos === offset) return i;
    if (asEnd && next === offset) return i;
    pos = next;
  }
  throw new Error("Cue does not align to character boundaries");
}

function nthPhraseOffset(text, phrase, occurrence) {
  if (typeof phrase !== "string" || phrase.length === 0) {
    throw new Error("Cue phrase is missing");
  }
  if (!Number.isInteger(occurrence) || occurrence < 1) {
    throw new Error("Cue occurrence is invalid");
  }
  let from = 0;
  let found = -1;
  for (let n = 1; n <= occurrence; n++) {
    found = text.indexOf(phrase, from);
    if (found === -1) {
      throw new Error("Cue phrase was not found in the text");
    }
    from = found + 1;
  }
  return found;
}

function resolveCue(text, characters, starts, ends, cue) {
  if (!cue || typeof cue !== "object") {
    throw new Error("Cue is invalid");
  }
  if (typeof cue.target !== "string" || !cue.target.trim()) {
    throw new Error("Cue target is missing");
  }
  const occurrence = cue.occurrence ?? 1;
  const startOffset = nthPhraseOffset(text, cue.phrase, occurrence);
  const endOffset = startOffset + cue.phrase.length;
  const first = charIndexAtStringOffset(characters, startOffset, false);
  const last = charIndexAtStringOffset(characters, endOffset, true);
  return {
    target: cue.target,
    reveal: cue.reveal !== false,
    start: starts[first],
    end: ends[last],
  };
}

/**
 * Map provider character alignment onto cue phrases. Throws on any mismatch;
 * never estimates timing.
 */
export function resolveAlignment(text, provider, cues = []) {
  if (typeof text !== "string") {
    throw new Error("Alignment text is invalid");
  }
  const { characters, starts, ends } = requireArrays(provider);
  if (characters.join("") !== text) {
    throw new Error("Alignment characters do not match the text");
  }
  assertTimes(starts, ends);
  if (!Array.isArray(cues)) {
    throw new Error("Cues must be an array");
  }
  const resolved = cues.map((cue) =>
    resolveCue(text, characters, starts, ends, cue),
  );
  const duration = ends.length ? ends[ends.length - 1] : 0;
  return {
    duration,
    characters,
    starts,
    ends,
    cues: resolved,
  };
}
