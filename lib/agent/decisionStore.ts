/**
 * Persists human rulings on contradictions.
 * Stored as `contractDecision` docs in Sanity (Context MCP is read-only, so we
 * write server-side with the write client). Falls back to memory when Sanity
 * is not configured, and reports which store was used.
 */
import { sanityClient, sanityWriteClient, isLiveSanityConfigured } from '../sanity/client.ts';

export interface ContractDecision {
  contradictionId: string;
  serviceId?: string;
  field: string;
  attribute: string;
  claimA: string;
  sourceA: string;
  claimB: string;
  sourceB: string;
  chosen: 'A' | 'B';
  reason?: string;
  decidedBy: string;
  decidedAt: string;
}

const memory = new Map<string, ContractDecision>();
const docId = (cid: string) => `decision.${cid.replace(/[^a-zA-Z0-9._-]/g, '-')}`;
const canWrite = () => isLiveSanityConfigured() && Boolean(process.env.SANITY_API_TOKEN);

export async function listDecisions(): Promise<{ decisions: ContractDecision[]; store: 'sanity' | 'memory' }> {
  if (canWrite()) {
    try {
      const rows: ContractDecision[] = await sanityClient.fetch(`*[_type == "contractDecision"]{
        contradictionId, serviceId, field, attribute, claimA, sourceA, claimB, sourceB, chosen, reason, decidedBy, decidedAt
      }`);
      return { decisions: rows, store: 'sanity' };
    } catch {
      /* fall through to memory */
    }
  }
  return { decisions: [...memory.values()], store: 'memory' };
}

export async function saveDecision(d: ContractDecision): Promise<{ store: 'sanity' | 'memory' }> {
  if (canWrite()) {
    await sanityWriteClient.createOrReplace({ _id: docId(d.contradictionId), _type: 'contractDecision', ...d } as any);
    return { store: 'sanity' };
  }
  memory.set(d.contradictionId, d);
  return { store: 'memory' };
}
