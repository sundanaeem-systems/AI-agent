# mobile-bff changelog (consumer of ep_customer_billing_profile)

Service: srv_mobile_bff · Owner: mobile-guild · Current client version: v2.8.0

## v2.8.0 (current)
- Migrated date handling to a shared `DateValue` utility. As part of this,
  `billingCycleAnchor` from billing-core is now parsed as an **ISO 8601
  string** (`"2026-11-01T00:00:00Z"`), not a unix-seconds number. The parser
  was updated to `new Date(value)`, which happens to also accept a numeric
  string, so this shipped without failing CI even though it silently
  disagrees with billing-core's documented `number` type.
- Continues to read `subscriptionStatus`, `currency` unchanged.

## v2.7.0
- Last version where `billingCycleAnchor` was explicitly parsed with
  `new Date(anchor * 1000)`, matching the unix-seconds contract.

## Known issue (open)
- QA flagged that v2.8.0's date parsing "mostly works by accident" because
  `Date()` is lenient about numeric strings, but will break if billing-core
  ever sends a real ISO string with a `Z` suffix through a code path that
  isn't caught by the lenient parser. Ticket MOBILE-4417, unresolved.

This is what the mobile client actually assumes in production, independent
of what the OpenAPI spec says `billingCycleAnchor`'s type is.
