// Applies db/schema.sql. Idempotent and self-healing, so it is safe to run on
// every deploy and safe to run twice.
//
//   node tools/migrate.mjs
import { readFile } from "node:fs/promises";
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL_POKERCOACH ?? process.env.NETLIFY_DATABASE_URL ?? process.env.DATABASE_URL;
if (!url) {
  console.error("No database URL. Set DATABASE_URL_POKERCOACH (see .env.master) and retry.");
  process.exit(1);
}

const sql = neon(url);
const source = await readFile(new URL("../db/schema.sql", import.meta.url), "utf8");

// Split on semicolons that end a statement. The schema deliberately contains no
// functions or dollar-quoted bodies, so this stays honest.
const statements = source
  .split(/;\s*$/m)
  .map((statement) => statement.trim())
  .filter((statement) => statement && !statement.split("\n").every((line) => line.trim().startsWith("--")));

let applied = 0;
for (const statement of statements) {
  try {
    await sql.query(statement);
    applied += 1;
  } catch (error) {
    console.error(`\nFailed on:\n${statement.slice(0, 200)}\n\n${error.message}`);
    process.exit(1);
  }
}

const tables = await sql`
  select table_name from information_schema.tables
  where table_schema = 'public' order by table_name
`;
console.log(`Applied ${applied} statements.`);
console.log(`Objects: ${tables.map((row) => row.table_name).join(", ")}`);
