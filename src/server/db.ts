import "server-only";
import { join } from "node:path";
import { createStore } from "./store.mjs";
type Store = ReturnType<typeof createStore>;
const globals = globalThis as unknown as { learningStore?: Store };
// Opened on first use, not at import: `next build` imports every page in
// parallel workers, and opening SQLite there raced for the write lock.
function instance(): Store {
  return (globals.learningStore ??= createStore(
    process.env.DATABASE_PATH ||
      join(process.cwd(), ".data", "learning.sqlite"),
  ));
}
export const store = new Proxy({} as Store, {
  get: (_, key) => Reflect.get(instance(), key),
});
