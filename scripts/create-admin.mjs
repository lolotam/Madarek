import { createStore } from "../src/server/store.mjs";
import { join } from "node:path";
const email = process.argv[2];
if (!email) {
  console.error(
    "Usage: npm run admin -- owner@example.com (register this separate account first)",
  );
  process.exit(1);
}
const store = createStore(
  process.env.DATABASE_PATH || join(process.cwd(), ".data", "learning.sqlite"),
);
try {
  const user = store.promoteAdmin(email);
  console.log(
    "Administrator role set for account:",
    user.name,
    "— sign in again.",
  );
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  store.close();
}
