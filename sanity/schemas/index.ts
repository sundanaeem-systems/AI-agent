/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Sanity Schema Index
 * ChronoGraph - Autonomous Cross-System Breaking-Change Sentinel
 */

import { serviceSchema } from './serviceSchema.ts';
import { apiEndpointSchema } from './apiEndpointSchema.ts';
import { userRoleSchema } from './userRoleSchema.ts';
import { contractDecisionSchema } from './contractDecisionSchema.ts';

export const schemaTypes = [
  serviceSchema,
  apiEndpointSchema,
  userRoleSchema,
  contractDecisionSchema,
];

export { serviceSchema, apiEndpointSchema, userRoleSchema, contractDecisionSchema };
export default schemaTypes;
