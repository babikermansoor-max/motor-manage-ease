import { createServerFn } from "@tanstack/react-start";
import { applyOp, type Op } from "./ops";

// Central storage: the store is one JSON row (app_state) in PostgreSQL (DATABASE_URL).
// Writes arrive as individual operations applied in order under a row lock, so concurrent cashiers never overwrite each other.
// Without DATABASE_URL (e.g. Lovable preview) functions report enabled:false and the app stays local-only.
type Sql = any;
let sqlPromise: Promise<Sql | null> | null = null;

async function getSql(): Promise<Sql | null> {
  const url = process.env["DATABASE_URL"];
  if (!url) return null;
  if (!sqlPromise) {
    sqlPromise = (async () => {
      const { default: postgres } = await import("postgres");
      const sql = postgres(url, { max: 5, ssl: false, idle_timeout: 30 });
      await sql`create table if not exists app_state (id text primary key, data jsonb not null, version bigint not null default 0, updated_at timestamptz not null default now())`;
      await sql`create table if not exists ops_log (id text primary key, kind text not null, at timestamptz not null default now(), ok boolean not null, error text)`;
      return sql;
    })().catch((e) => { sqlPromise = null; throw e; });
  }
  return sqlPromise;
}

export const pullState = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  if (!sql) return { enabled: false as const, version: 0, data: null as string | null };
  const rows = await sql`select data::text as data, version from app_state where id = 'main'`;
  if (!rows.length) return { enabled: true as const, version: 0, data: null as string | null };
  return { enabled: true as const, version: Number(rows[0].version), data: rows[0].data as string };
});

// Only used by the first device when the server has no data yet.
export const pushState = createServerFn({ method: "POST" })
  .inputValidator((d: { data: string }) => {
    if (typeof d?.data !== "string" || d.data.length > 50_000_000) throw new Error("invalid");
    JSON.parse(d.data);
    return d;
  })
  .handler(async ({ data }) => {
    const sql = await getSql();
    if (!sql) return { enabled: false, version: 0 };
    const rows = await sql`insert into app_state (id, data, version) values ('main', ${sql.json(JSON.parse(data.data))}, 1)
      on conflict (id) do nothing returning version`;
    if (rows.length) return { enabled: true, version: 1 };
    const cur = await sql`select version from app_state where id = 'main'`;
    return { enabled: true, version: Number(cur[0].version) };
  });

export const applyOps = createServerFn({ method: "POST" })
  .inputValidator((d: { ops: Op[] }) => {
    if (!Array.isArray(d?.ops) || d.ops.length > 500) throw new Error("invalid");
    for (const o of d.ops) if (typeof o?.id !== "string" || typeof o?.kind !== "string") throw new Error("invalid op");
    return d;
  })
  .handler(async ({ data }) => {
    const sql = await getSql();
    if (!sql) return { enabled: false as const, version: 0, data: null as string | null, results: [] as { id: string; ok: boolean; error?: string }[] };
    return sql.begin(async (tx: Sql) => {
      const rows = await tx`select data, version from app_state where id = 'main' for update`;
      if (!rows.length) throw new Error("no state");
      let db = rows[0].data;
      const results: { id: string; ok: boolean; error?: string }[] = [];
      for (const op of data.ops) {
        const seen = await tx`select ok, error from ops_log where id = ${op.id}`;
        if (seen.length) { results.push({ id: op.id, ok: seen[0].ok, error: seen[0].error ?? undefined }); continue; }
        try { db = applyOp(db, op); results.push({ id: op.id, ok: true }); await tx`insert into ops_log (id, kind, ok) values (${op.id}, ${op.kind}, true)`; }
        catch (e) { const msg = (e as Error).message; results.push({ id: op.id, ok: false, error: msg }); await tx`insert into ops_log (id, kind, ok, error) values (${op.id}, ${op.kind}, false, ${msg})`; }
      }
      const up = await tx`update app_state set data = ${tx.json(db)}, version = version + 1, updated_at = now() where id = 'main' returning version`;
      return { enabled: true as const, version: Number(up[0].version), data: JSON.stringify(db) as string | null, results };
    });
  });
