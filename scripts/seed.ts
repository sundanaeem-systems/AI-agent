/**
 * Seeds the live Sanity dataset with the ChronoGraph service graph so the
 * Context MCP (GROQ mode) has real documents to query.
 *
 *   npm run seed        (needs NEXT_PUBLIC_SANITY_PROJECT_ID + SANITY_API_TOKEN with write access)
 *   npm run schema:deploy
 */
import 'dotenv/config';
import { sanityWriteClient, isLiveSanityConfigured } from '../lib/sanity/client.ts';
import { INITIAL_SERVICES, INITIAL_ENDPOINTS } from '../lib/sanity/sanityData.ts';

const ref = (id: string) => ({ _type: 'reference', _ref: id, _weak: true });
const existing = new Set([...INITIAL_SERVICES.map((s) => s._id), ...INITIAL_ENDPOINTS.map((e) => e._id)]);

async function main() {
  if (!isLiveSanityConfigured() || !process.env.SANITY_API_TOKEN) {
    console.error('Set NEXT_PUBLIC_SANITY_PROJECT_ID and SANITY_API_TOKEN (write) in .env first.');
    process.exit(1);
  }
  const tx = sanityWriteClient.transaction();

  for (const s of INITIAL_SERVICES) {
    tx.createOrReplace({
      ...s,
      endpoints: s.endpointIds.filter((i) => existing.has(i)).map((i, n) => ({ ...ref(i), _key: `e${n}` })),
      upstreamServices: s.upstreamServiceIds.filter((i) => existing.has(i)).map((i, n) => ({ ...ref(i), _key: `u${n}` })),
      downstreamServices: s.downstreamServiceIds.filter((i) => existing.has(i)).map((i, n) => ({ ...ref(i), _key: `d${n}` })),
    } as any);
  }

  for (const e of INITIAL_ENDPOINTS) {
    tx.createOrReplace({
      ...e,
      service: ref(e.serviceId), // schema uses a reference; `serviceId` string is kept for GROQ convenience
      fieldContracts: e.fieldContracts.map((f, n) => ({ _key: `f${n}`, _type: 'fieldContract', ...f })),
      consumers: e.consumers.map((c, n) => ({
        _key: `c${n}`,
        _type: 'downstreamConsumerBinding',
        ...c,
        consumerService: ref(c.consumerServiceId),
      })),
    } as any);
  }

  const res = await tx.commit();
  console.log(`Seeded ${INITIAL_SERVICES.length} services and ${INITIAL_ENDPOINTS.length} endpoints (tx ${res.transactionId}).`);
}

main().catch((err) => { console.error(err); process.exit(1); });
