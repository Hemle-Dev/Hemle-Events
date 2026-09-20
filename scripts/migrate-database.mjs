import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import postgres from "postgres";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL est requis.");
const sql = postgres(process.env.DATABASE_URL, { max: 1, onnotice: () => {} });
const directory = new URL("../drizzle/migrations/", import.meta.url);
const journal = JSON.parse(await readFile(new URL("meta/_journal.json", directory), "utf8"));
try {
  await sql.begin(async (transaction) => {
    await transaction`SELECT pg_advisory_xact_lock(48201926)`;
    await transaction`CREATE SCHEMA IF NOT EXISTS drizzle`;
    await transaction`CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
      id serial PRIMARY KEY, hash text NOT NULL, created_at bigint
    )`;
    const applied =
      await transaction`SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at`;
    const [existing] = await transaction`SELECT to_regclass('public.events') AS events`;
    if (!applied.length && existing.events) {
      throw new Error(
        "Base historique sans journal : ne pas rejouer 0000. Suivre la procédure de migration historique du README.",
      );
    }
    const latest = Number(applied.at(-1)?.created_at || 0);
    for (const entry of journal.entries) {
      const source = await readFile(new URL(`${entry.tag}.sql`, directory), "utf8");
      const hash = createHash("sha256").update(source).digest("hex");
      const previous = applied.find((item) => Number(item.created_at) === entry.when);
      if (previous && previous.hash !== hash)
        throw new Error(`Migration déjà appliquée mais modifiée : ${entry.tag}`);
      if (entry.when <= latest) continue;
      await transaction.unsafe(source);
      await transaction`INSERT INTO drizzle.__drizzle_migrations(hash,created_at) VALUES (${hash},${entry.when})`;
      console.log(`Migration appliquée : ${entry.tag}`);
    }
  });
  console.log("Migrations terminées.");
} finally {
  await sql.end();
}
