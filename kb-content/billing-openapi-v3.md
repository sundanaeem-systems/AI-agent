# billing-core OpenAPI v3 — /v1/customers/:id/billing

Service: srv_billing_core · Owner: payments-platform · Spec version: 3.2.0

## Response schema (GetCustomerBillingProfile)

- `customerId` (string, required, not nullable) — UUID or `cus_xxx`.
- `paymentMethodId` (string, required, not nullable) — vault token.
- `subscriptionStatus` (string enum, required) — `active | past_due | canceled | trialing`.
- `currency` (string, required, ISO 4217).
- `taxId` (string, **required as of v3.0.0**, not nullable) — VAT/EIN. The
  v3 migration made this mandatory for every account after the 2026-Q2 EU
  invoicing compliance change; omitting it now fails schema validation at
  the gateway. Accounts created before the migration were backfilled with a
  placeholder value, so no consumer should treat this field as optional.
- `billingCycleAnchor` (integer, required) — unix seconds for next invoice.

## Change history

- v3.0.0: `taxId` promoted from optional to required, backfilled all rows.
- v2.x: `taxId` was optional and nullable for non-EU accounts.

This document is the source of truth for what billing-core is contractually
supposed to return today. Compare against consumer changelogs for what
clients actually assume in production, they can lag behind a spec change.
