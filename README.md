# ChronoGraph — Autonomous Cross-System Breaking-Change Sentinel

Built for the **Sanity Challenge, Path One: Ship an Agent That Queries Real Content**.

ChronoGraph reviews an API diff and tells you, before merge, which downstream
services and teams it will break — by asking a Gemini agent to query two
Sanity Context MCP endpoints (a live dataset and a Knowledge Base) instead of
guessing from memory. When the dataset and the docs disagree about a field's
contract, both claims are shown side by side with their sources, and a human
ruling is written back to Sanity so the same question isn't re-asked later.

## Path One setup (do this first)

1. Deploy the schema to your Sanity project:
   ```bash
   npm install
   npm run schema:deploy
   ```
2. Seed the dataset so the graph endpoint has real documents:
   ```bash
   npm run seed
   ```
3. In the Sanity Dashboard → Context app, create:
   - A **dataset** endpoint named `chronograph-graph` pointed at this project (GROQ mode).
   - A **Knowledge Base** built from the files in `kb-content/` (see `kb-content/README.md`
     for the three intentional contradictions they contain), exposed as an
     endpoint named `chronograph-docs`.
   - An **organization-level** API token with the Context Viewer role (a
     project token is rejected with `403 contextGrantRequired`).
4. Fill in `.env` from `.env.example` (`SANITY_ORG_ID`, `SANITY_CONTEXT_TOKEN`,
   `GEMINI_API_KEY`, `GEMINI_MODEL`).
5. `npm run dev` and submit a diff that touches `taxId`, `billingCycleAnchor`
   or `subscriptionStatus` on `srv_billing_core` — the agent trace panel will
   show it calling both endpoints, and a contradiction card will appear.

Without `SANITY_ORG_ID`/`SANITY_CONTEXT_TOKEN` set, the app still runs on the
seeded in-memory graph and deterministic diff analysis, but the Context
Agent panel will say plainly that it is not active rather than faking it.
## A note on Gemini API quotas (please read before testing)

This submission uses the Gemini API's **free tier**, which enforces a hard
limit of **20 requests/day and 5 requests/minute per model, per project**
(Google's limit, not configurable by this app). Both the deterministic
Sentinel analysis and the Sanity Context Agent each consume one request per
"Analyze Breaking Changes" click, so repeated testing can exhaust the daily
quota — if that happens, Gemini returns a `429 RESOURCE_EXHAUSTED` error and
the Context Agent trace will show that error message instead of a tool
trace.

**This is a known, expected limitation of the free tier, not a bug in the
integration.** Two things to know if you hit it while judging:

1. **The deterministic Sentinel analysis (AST-based breaking-change
   detection, dependency traversal, blast-radius calculation) does not
   depend on this quota at all** and will keep working even when the AI
   reasoning layer is rate-limited.
2. **The Sanity Context Agent → Knowledge Base integration has been verified
   working** in repeated manual tests: the agent calls `docs__initial_context`
   and `docs__knowledge_base_search` against the live Sanity Context MCP
   endpoint, retrieves real Knowledge Base content, and — when the content
   actually conflicts with the dataset — surfaces both claims side by side.
   A screen recording of a successful run is included in the demo video
   linked above in case the quota is exhausted at review time.

If you'd like to test the live agent yourself and hit the quota, waiting a
few minutes (per-minute limit) or until the daily reset usually clears it;
alternatively I'm happy to swap in a billed API key on request.
## Architecture

- `lib/sanity/contextMcpClient.ts` — thin MCP client over the two hosted
  Sanity Context endpoints.
- `lib/agent/sentinelAgent.ts` — the actual agent loop: Gemini is given both
  endpoints' tools as function declarations and decides for itself what to
  query, in a loop, up to 8 steps.
- `lib/agent/decisionStore.ts` — reads/writes `contractDecision` documents in
  Sanity (Context MCP is read-only, so rulings are written with a normal
  write client).
- `src/components/AgentTracePanel.tsx` / `ContradictionCard.tsx` — UI for the
  above.
- `sanity/schemas/contractDecisionSchema.ts` — the schema for saved rulings.
- `kb-content/` — source files for the Knowledge Base, with three
  intentional dataset-vs-docs contradictions.

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
