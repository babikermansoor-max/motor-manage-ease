<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- Self-hosting (Coolify/VPS): `npm run build` targets Nitro node-server (ignored inside Lovable, which keeps its own target) and `npm start` runs .output/server/index.mjs on PORT (default 3000); keep both scripts so external deploys work without manual commands.
- Central data: the store is one JSON row (app_state) in PostgreSQL via DATABASE_URL; every write is an Op (src/lib/ops.ts, pure applyOp shared by browser and server) sent to applyOps, which applies ops in order under a row lock and dedupes by op id in ops_log, so concurrent cashiers never overwrite each other. Generic setDB edits become patch ops; without DATABASE_URL the app stays browser-only.
