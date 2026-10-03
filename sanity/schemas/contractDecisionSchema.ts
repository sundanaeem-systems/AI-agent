/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sanity Schema: Contract Decision
 * Stores the human ruling on a contradiction between two sources
 * (e.g. OpenAPI spec vs consumer changelog) so future agent runs
 * treat the question as settled instead of asking again.
 */
export const contractDecisionSchema = {
  name: 'contractDecision',
  title: 'Contract Decision (Contradiction Ruling)',
  type: 'document',
  icon: () => '⚖️',
  fields: [
    { name: 'contradictionId', title: 'Contradiction ID', type: 'string', validation: (Rule: any) => Rule.required() },
    { name: 'serviceId', title: 'Service ID', type: 'string' },
    { name: 'field', title: 'Field', type: 'string' },
    { name: 'attribute', title: 'Attribute in dispute', type: 'string', description: 'nullability | type | unit | required | deprecation | other' },
    { name: 'claimA', title: 'Claim A', type: 'text', rows: 2 },
    { name: 'sourceA', title: 'Source A', type: 'string' },
    { name: 'claimB', title: 'Claim B', type: 'text', rows: 2 },
    { name: 'sourceB', title: 'Source B', type: 'string' },
    { name: 'chosen', title: 'Chosen claim', type: 'string', options: { list: ['A', 'B'] }, validation: (Rule: any) => Rule.required() },
    { name: 'reason', title: 'Reason', type: 'text', rows: 2 },
    { name: 'decidedBy', title: 'Decided by', type: 'string' },
    { name: 'decidedAt', title: 'Decided at', type: 'datetime' },
  ],
  preview: { select: { title: 'field', subtitle: 'chosen' } },
};
