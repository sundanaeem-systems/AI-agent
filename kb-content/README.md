# Knowledge Base source files

Upload every .md file in this folder into a Sanity Knowledge Base (Sanity
Dashboard → Context app → Knowledge Bases → New → Upload files), then point a
Context MCP endpoint named `chronograph-docs` at that Knowledge Base (see
.env.example). Stays well under the current 150-document beta limit.

These files intentionally disagree with each other and with the seeded
dataset (`lib/sanity/sanityData.ts`) on three fields, so the agent has real
contradictions to surface instead of a single clean source of truth:

| Field | Dataset (`chronograph-graph`) says | KB doc says | File |
|---|---|---|---|
| `taxId` | optional, nullable (`srv_billing_core` / `ep_customer_billing_profile`) | OpenAPI spec: **required**, non-nullable in v3 | `billing-openapi-v3.md` |
| `billingCycleAnchor` | `number` (unix seconds) | mobile-bff changelog: client already treats it as **ISO 8601 string** after a v2.8 migration | `consumer-changelog-mobile-bff.md` |
| `subscriptionStatus` deprecation | dataset: not deprecated | runbook: team **quietly deprecated** `"trialing"` two months ago, replaced by `"trial"`, no schema update yet | `runbook-billing-oncall.md` |

Everything else here is real supporting context: routing, on-call, deposit
policy — same spirit as consistent facts in the Sentinel demo, just written
as prose instead of TypeScript.
