/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Sanity Schema: API Endpoint & Contract Matrix
 * ChronoGraph - Autonomous Cross-System Breaking-Change Sentinel
 * 
 * Defines endpoints, explicit JSON/GROQ/GraphQL field schemas,
 * nullability rules, and multi-team downstream consumer registrations.
 */

export interface FieldContract {
  _key?: string;
  fieldName: string;
  jsonPath: string;
  dataType: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'reference' | 'null';
  required: boolean;
  nullable: boolean;
  validationRules?: string[];
  sensitivity: 'public' | 'internal' | 'pii' | 'pci-dss' | 'restricted';
  description?: string;
  exampleValue?: string;
}

export interface DownstreamConsumerEntry {
  _key?: string;
  consumerService: { _ref: string; _type: 'reference' };
  consumerTeam: string;
  consumedFields: string[];
  clientVersion: string;
  criticality: 'critical' | 'high' | 'medium' | 'low';
  trafficPercentage: number;
  slaMaxLatencyMs?: number;
  contactEmail?: string;
}

export interface ApiEndpointDocument {
  _id: string;
  _type: 'apiEndpoint';
  name: string;
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'GROQ_QUERY' | 'EVENT_STREAM';
  service: { _ref: string; _type: 'reference' };
  description?: string;
  isPublic: boolean;
  slaUptimeTarget: number;
  deprecated: boolean;
  deprecationNotice?: string;
  fieldContracts: FieldContract[];
  consumers: DownstreamConsumerEntry[];
}

export const apiEndpointSchema = {
  name: 'apiEndpoint',
  title: 'API Endpoint Contract',
  type: 'document',
  icon: () => '🔌',
  fields: [
    {
      name: 'name',
      title: 'Endpoint Identifier',
      type: 'string',
      description: 'Human-readable descriptor (e.g., Get Customer Invoicing Profile)',
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: 'path',
      title: 'Contract Route / Query URI',
      type: 'string',
      description: 'e.g. /v2/customers/:id/billing or GROQ projection *[_type == "order"]',
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: 'method',
      title: 'Invocation Method',
      type: 'string',
      options: {
        list: [
          { title: 'GET (Safe Read)', value: 'GET' },
          { title: 'POST (Mutation / Query)', value: 'POST' },
          { title: 'PUT (Idempotent Replace)', value: 'PUT' },
          { title: 'PATCH (Partial Delta)', value: 'PATCH' },
          { title: 'DELETE (Resource Tear-Down)', value: 'DELETE' },
          { title: 'GROQ_QUERY (Sanity Live Projection)', value: 'GROQ_QUERY' },
          { title: 'EVENT_STREAM (SSE / Webhook / Kafka)', value: 'EVENT_STREAM' },
        ],
      },
      initialValue: 'POST',
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: 'service',
      title: 'Host Microservice',
      type: 'reference',
      to: [{ type: 'service' }],
      description: 'The upstream provider hosting and publishing this contract',
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: 'description',
      title: 'Functional Contract Purpose',
      type: 'text',
      rows: 2,
    },
    {
      name: 'isPublic',
      title: 'Exposed to External Third Parties',
      type: 'boolean',
      initialValue: false,
    },
    {
      name: 'slaUptimeTarget',
      title: 'SLA Uptime Target (%)',
      type: 'number',
      initialValue: 99.95,
      validation: (Rule: any) => Rule.min(90).max(100),
    },
    {
      name: 'deprecated',
      title: 'Deprecated for Sunset',
      type: 'boolean',
      initialValue: false,
    },
    {
      name: 'deprecationNotice',
      title: 'Deprecation & Sunset Timeline',
      type: 'text',
      rows: 2,
      hidden: ({ parent }: any) => !parent?.deprecated,
    },
    {
      name: 'fieldContracts',
      title: 'Schema Field Contracts (Strict Type Assertions)',
      type: 'array',
      description: 'Granular field properties monitored by the Sentinel AST for non-breaking compatibility',
      of: [
        {
          type: 'object',
          name: 'fieldContract',
          fields: [
            {
              name: 'fieldName',
              title: 'Field Key Name',
              type: 'string',
              validation: (Rule: any) => Rule.required(),
            },
            {
              name: 'jsonPath',
              title: 'JSON / GROQ Path',
              type: 'string',
              description: 'e.g., payload.data.customer.taxId',
              validation: (Rule: any) => Rule.required(),
            },
            {
              name: 'dataType',
              title: 'Primitive / Complex Type',
              type: 'string',
              options: {
                list: [
                  'string',
                  'number',
                  'boolean',
                  'object',
                  'array',
                  'reference',
                  'null',
                ],
              },
              validation: (Rule: any) => Rule.required(),
            },
            {
              name: 'required',
              title: 'Is Mandatory (Required in response/payload)',
              type: 'boolean',
              initialValue: true,
            },
            {
              name: 'nullable',
              title: 'Allows Null Values',
              type: 'boolean',
              initialValue: false,
            },
            {
              name: 'sensitivity',
              title: 'Data Classification Level',
              type: 'string',
              options: {
                list: ['public', 'internal', 'pii', 'pci-dss', 'restricted'],
              },
              initialValue: 'internal',
            },
            {
              name: 'description',
              title: 'Field Semantics',
              type: 'string',
            },
            {
              name: 'validationRules',
              title: 'Validation Regex / Assertions',
              type: 'array',
              of: [{ type: 'string' }],
            },
          ],
          preview: {
            select: {
              title: 'fieldName',
              type: 'dataType',
              req: 'required',
              path: 'jsonPath',
            },
            prepare({ title, type, req, path }: any) {
              return {
                title: `${title} (${type}${req ? '!' : '?'})`,
                subtitle: path,
              };
            },
          },
        },
      ],
    },
    {
      name: 'consumers',
      title: 'Registered Downstream Consumers',
      type: 'array',
      description: 'Active client systems, microservices, and mobile apps binding to this contract',
      of: [
        {
          type: 'object',
          name: 'downstreamConsumerBinding',
          fields: [
            {
              name: 'consumerService',
              title: 'Consumer Service Reference',
              type: 'reference',
              to: [{ type: 'service' }],
              validation: (Rule: any) => Rule.required(),
            },
            {
              name: 'consumerTeam',
              title: 'Consumer Team Name',
              type: 'string',
              validation: (Rule: any) => Rule.required(),
            },
            {
              name: 'clientVersion',
              title: 'Deployed Client Version',
              type: 'string',
              initialValue: 'v1.4.0',
            },
            {
              name: 'criticality',
              title: 'Consumer Impact Tier',
              type: 'string',
              options: {
                list: ['critical', 'high', 'medium', 'low'],
              },
              initialValue: 'high',
            },
            {
              name: 'consumedFields',
              title: 'Fields Explicitly Ingested by Consumer',
              type: 'array',
              of: [{ type: 'string' }],
              description: 'Subset of field contracts relied upon by this consumer',
            },
            {
              name: 'trafficPercentage',
              title: 'Percentage of Overall Traffic Ingestion',
              type: 'number',
              initialValue: 25,
            },
            {
              name: 'contactEmail',
              title: 'Consumer Incident Owner Email',
              type: 'string',
            },
          ],
          preview: {
            select: {
              title: 'consumerTeam',
              criticality: 'criticality',
              version: 'clientVersion',
            },
            prepare({ title, criticality, version }: any) {
              return {
                title: `${title} (${version})`,
                subtitle: `Impact: ${criticality.toUpperCase()}`,
              };
            },
          },
        },
      ],
    },
  ],
  preview: {
    select: {
      title: 'name',
      method: 'method',
      path: 'path',
      deprecated: 'deprecated',
    },
    prepare({ title, method, path, deprecated }: any) {
      return {
        title: `${method} ${path}`,
        subtitle: `${title} ${deprecated ? '⚠️ [DEPRECATED]' : ''}`,
      };
    },
  },
};

export default apiEndpointSchema;
