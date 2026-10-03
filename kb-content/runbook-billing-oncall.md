# billing-core on-call runbook

Service: srv_billing_core · Slack: #alerts-identity / #payments-oncall

## Rollback procedure for contract changes
1. Revert the offending PR, redeploy `srv_billing_core`.
2. Notify `order-platform`, `fintech-compliance`, `mobile-guild` in their
   on-call channels (see consumer list in the Sentinel dashboard).
3. File a postmortem if any consumer returned 5xx for >5 minutes.

## subscriptionStatus enum — informal deprecation (not yet in the spec)

Since 2026-08, new accounts are created with `subscriptionStatus: "trial"`
instead of `"trialing"`. This was a product decision made in the
#payments-oncall channel, not a version bump: the OpenAPI spec and the
Sanity dataset still list `"trialing"` as the only trial value, and no
migration or deprecation notice was ever filed. Existing accounts still
read `"trialing"`. Any consumer written against the documented enum
(`active | past_due | canceled | trialing`) will silently mis-handle new
trial accounts that now send `"trial"`.

Escalate to payments-platform before relying on either value exclusively.

## Deposit / no-show adjacent note
Not applicable to this service — this runbook covers billing-core only.
