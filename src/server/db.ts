import "server-only";
import { join } from "node:path";
import { createStore } from "./store.mjs";
const globals = globalThis as unknown as {
  learningStore?: ReturnType<typeof createStore>;
};
export const store = (globals.learningStore ??= createStore(
  process.env.DATABASE_PATH || join(process.cwd(), ".data", "learning.sqlite"),
));
