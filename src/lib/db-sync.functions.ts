import { createServerFn } from "@tanstack/react-start";

// Central storage: the whole store is kept as one JSON row in PostgreSQL (DATABASE_URL).
// When DATABASE_URL is missing (e.g. Lovable preview), functions report enabled:false and the app stays local-only.
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

export const pushState = createServerFn({ method: "POST" })
  .inputValidator((d: { data: string }) => {
    if (typeof d?.data !== "string" || d.data.length > 50_000_000) throw new Error("invalid");
    JSON.parse(d.data);
    return d;
  })
  .handler(async ({ data }) => {
    const sql = await getSql();
    if (!sql) return { enabled: false, version: 0 };
    const rows = await sql`insert into app_state (id, data, version) values ('main', ${data.data}::jsonb, 1)
      on conflict (id) do update set data = excluded.data, version = app_state.version + 1, updated_at = now()
      returning version`;
    return { enabled: true, version: Number(rows[0].version) };
  });
