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
