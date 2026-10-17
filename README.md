# Foothold

An AI growth operator for solo founders: it reads your landing page, finds the threads and groups where your buyers already describe the pain you solve, and hands you three or four growth moves a day with the content drafted. You review, edit, and publish from your own accounts. It never posts for you.

This is a working MVP built as a clean-room take on the "AI marketing co-founder" category. The architecture, playbook library, and prompts are original; nothing here is copied from any existing product.

## How it works

```
/start quiz  ->  POST /api/products  ->  runOnboarding()
                                            |- snapshotSite()   scrape title, H1/H2, CTAs, pricing, proof, analytics
                                            |- runAudit()       score + positioning rewrite + 5-9 findings
                                            |- runAudience()    ICPs, competitors, communities, listening queries
                                            |- runRoadmap()     30-day plan
                                            '- generateDailyMoves()
                                                  |- listen()   Reddit public JSON search on listening queries
                                                  '- draftMoves()  pick from playbooks, draft the content

/app/[id] dashboard  <-  GET /api/products/[id]      (everything in one call, polls while auditing)
                     <-  GET /api/products/[id]/funnel
                     ->  PATCH /api/moves/[id]        approve / done / skip / edit draft
                     ->  POST /api/products/[id]/moves   draft today's moves now

your site  ->  <script src=".../t.js" data-p="PRODUCT_ID">  ->  POST /api/track  (visit, signup, paywall, payment)

scheduler  ->  GET /api/cron/daily  (Bearer CRON_SECRET)  ->  drafts moves for every ready product
```

The moat in this category is not the model call. It is three things, all of which are plain files you can edit:

- `src/lib/playbooks.ts`: twelve tactics that work between zero and the first hundred paying users, each with stage gating, trigger conditions, platform rules, and a weekly cap. The model picks from this list; it does not invent tactics.
- `src/lib/ai.ts`: the operator system prompt. Specific, grounded, organic-first, never sounds like marketing.
- `src/lib/audit.ts` and `src/lib/moves.ts`: the prompts that turn a page snapshot, fresh threads, and recent history into findings and drafts.

## Run it

```bash
cp .env.example .env.local      # add ANTHROPIC_API_KEY
npm install
npm run seed                    # loads seed/provra.json into ./data/db.json
npm run dev                     # http://localhost:3000
```

Open the URL the seed prints (`/app/<id>`) to see a fully populated dashboard without spending a token. Then go to `/start` and run a real audit on any URL.

### Storage

With no Supabase variables set, everything lives in `./data/db.json`. One process, one file, fine for local and for a single Railway instance with a volume mounted at `DATA_DIR`.

To use Postgres: create a Supabase project, run `supabase/migrations/0001_init.sql` in the SQL editor, and set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. The app only uses the service role key on the server; RLS is on with no public policies, so nothing is reachable with the anon key. `npm run seed` works against either store.

### Daily moves on a schedule

Point any scheduler at `GET https://your-host/api/cron/daily` with header `authorization: Bearer $CRON_SECRET` once a morning. On Railway, add a second service from the same repo with the cron schedule `0 13 * * *` (06:00 Pacific) and the start command:

```
curl -fsS -H "authorization: Bearer $CRON_SECRET" "$APP_URL/api/cron/daily"
```

Or run `APP_URL=https://your-host CRON_SECRET=... npm run cron` from anywhere.

### Funnel tracking on your product

Paste before `</body>` on the marketing site and the app (same `data-p`, same host):

```html
<script src="https://your-foothold-host/t.js" data-p="PRODUCT_ID" defer></script>
```

It records a `visit` on load and stores an anonymous id in localStorage. Call `fh('signup')`, `fh('paywall')`, and `fh('payment')` at those moments. Fire `signup` and `payment` from the server if you can; ad blockers hide client-side events. A plain image pixel also works for visits: `/api/track?p=PRODUCT_ID&e=visit`.

### Deploy to Railway

`railway.json` is included. Set the env vars from `.env.example`, attach a volume at `/app/data` (or set `DATA_DIR` to the mount) if you are not using Supabase, and deploy.

## What is deliberately not here yet

- Auth. Dashboards are at unguessable UUIDs. Add Supabase Auth and an `owner_id` column on `products` before anyone but you uses it.
- X and LinkedIn listening. Reddit uses the public JSON endpoints. X needs a paid API key; LinkedIn has no public search API, so those playbooks draft content without live thread discovery.
- Email delivery of the morning moves. `email` is stored; wire Resend or Postmark into `/api/cron/daily` when you want it.
- Learning from the funnel. Moves marked done or skipped feed back into the next day's prompt (so skipped playbooks get retired), but funnel numbers are not yet correlated with moves. The data model supports it: events have timestamps, moves have dates.

## Notes on the Reddit rules

Reddit bans automated posting and shadowbans accounts that promote before they have history. Every Reddit playbook here drafts only; the founder publishes from their own account. The `reddit-helpful-reply` playbook's rules are the ones that matter: answer fully first, mention the product only when the thread is asking for tools, disclose, never duplicate across subreddits. Read a subreddit's rules before the first post.
