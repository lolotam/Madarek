import Ajv, { type ValidateFunction } from "ajv";

type Criterion = { key: string; label: string; max: number };
type ModelMark = {
  points: Record<string, number>;
  feedback: string;
  correction: string;
};
const ajv = new Ajv({
  strict: true,
  coerceTypes: false,
  removeAdditional: false,
});
const validators = new Map<string, ValidateFunction<ModelMark>>();

export function modelSchema(criteria: Criterion[]) {
  const points = Object.fromEntries(
    criteria.map((c) => [
      c.key,
      { type: "integer", minimum: 0, maximum: c.max },
    ]),
  );
  return {
    type: "object",
    additionalProperties: false,
    required: ["points", "feedback", "correction"],
    properties: {
      points: {
        type: "object",
        properties: points,
        required: criteria.map((c) => c.key),
        additionalProperties: false,
      },
      feedback: { type: "string", minLength: 1, maxLength: 600 },
      correction: { type: "string", minLength: 1, maxLength: 600 },
    },
  };
}
export function validateMark(
  candidate: unknown,
  criteria: Criterion[],
): ModelMark {
  const key = criteria.map((c) => c.key + "-" + c.max).join("/");
  let validate = validators.get(key);
  if (!validate) {
    validate = ajv.compile<ModelMark>(modelSchema(criteria));
    validators.set(key, validate);
  }
  if (
    !validate(candidate) ||
    !candidate.feedback.trim() ||
    !candidate.correction.trim()
  )
    throw new Error("Invalid grading response");
  return candidate;
}
