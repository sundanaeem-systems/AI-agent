/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Sanity Schema: Service
 * ChronoGraph - Autonomous Cross-System Breaking-Change Sentinel
 * 
 * Defines core microservices, upstream/downstream graph edges, ownership,
 * operational tiers, and active API endpoints.
 */

export interface ServiceDocument {
  _id: string;
  _type: 'service';
  name: string;
  slug: { current: string };
  serviceTier: 'tier-0-mission-critical' | 'tier-1-business-critical' | 'tier-2-standard' | 'tier-3-internal';
  ownerTeam: string;
  onCallSlack: string;
  repositoryUrl?: string;
  protocol: 'rest' | 'graphql' | 'grpc' | 'sanity-groq' | 'kafka';
  environment: 'production' | 'staging' | 'development';
  contractVersion: string;
  deploymentStatus: 'healthy' | 'degraded' | 'blocked-by-sentinel' | 'maintenance';
  endpoints?: Array<{ _ref: string; _type: 'reference' }>;
  upstreamServices?: Array<{ _ref: string; _type: 'reference' }>;
  downstreamServices?: Array<{ _ref: string; _type: 'reference' }>;
  tags?: string[];
  description?: string;
  updatedAt?: string;
}

export const serviceSchema = {
  name: 'service',
  title: 'Service Node',
  type: 'document',
  icon: () => '⚡',
  fields: [
    {
      name: 'name',
      title: 'Service Name',
      type: 'string',
      description: 'Canonical system identifier (e.g., Billing & Invoicing Core)',
      validation: (Rule: any) => Rule.required().min(2).max(100),
    },
    {
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'name',
        maxLength: 96,
      },
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: 'serviceTier',
      title: 'Service Tier (Criticality)',
      type: 'string',
      options: {
        list: [
          { title: 'Tier 0: Mission Critical (Global Outage Risk)', value: 'tier-0-mission-critical' },
          { title: 'Tier 1: Business Critical (Revenue Impacting)', value: 'tier-1-business-critical' },
          { title: 'Tier 2: Standard (Internal/Customer Facing)', value: 'tier-2-standard' },
          { title: 'Tier 3: Internal / Asynchronous Ops', value: 'tier-3-internal' },
        ],
        layout: 'radio',
      },
      initialValue: 'tier-1-business-critical',
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: 'ownerTeam',
      title: 'Owner Engineering Team',
      type: 'string',
      description: 'Team responsible for schema migrations and incident triage (e.g. checkout-platform)',
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: 'onCallSlack',
      title: 'On-Call Incident Channel',
      type: 'string',
      description: 'Slack/PagerDuty endpoint for sentinel automated escalation alerts (#alerts-billing)',
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: 'repositoryUrl',
      title: 'Repository URL',
      type: 'url',
    },
    {
      name: 'protocol',
      title: 'Primary Interface Protocol',
      type: 'string',
      options: {
        list: [
          { title: 'REST / JSON OpenAPI 3.1', value: 'rest' },
          { title: 'GraphQL Federation Subgraph', value: 'graphql' },
          { title: 'gRPC / Protocol Buffers', value: 'grpc' },
          { title: 'Sanity Content Lake (GROQ)', value: 'sanity-groq' },
          { title: 'Kafka / Event Streaming', value: 'kafka' },
        ],
      },
      initialValue: 'rest',
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: 'environment',
      title: 'Environment',
      type: 'string',
      options: {
        list: ['production', 'staging', 'development'],
      },
      initialValue: 'production',
    },
    {
      name: 'contractVersion',
      title: 'Active Semantic Schema Version',
      type: 'string',
      description: 'SemVer string (e.g. 2.4.1)',
      initialValue: '1.0.0',
      validation: (Rule: any) => Rule.required().regex(/^\d+\.\d+\.\d+$/, { name: 'semver' }),
    },
    {
      name: 'deploymentStatus',
      title: 'Deployment Sentinel Status',
      type: 'string',
      options: {
        list: [
          { title: 'Healthy (Contracts Satisfied)', value: 'healthy' },
          { title: 'Degraded (High Latency or Field Warnings)', value: 'degraded' },
          { title: 'Blocked by Sentinel (Breaking Diff Detected)', value: 'blocked-by-sentinel' },
          { title: 'Maintenance Mode', value: 'maintenance' },
        ],
      },
      initialValue: 'healthy',
    },
    {
      name: 'endpoints',
      title: 'Exposed API Endpoints & Queries',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'apiEndpoint' }] }],
      description: 'Endpoints exposed by this service and monitored for contract regressions',
    },
    {
      name: 'upstreamServices',
      title: 'Upstream Services (Direct Dependencies)',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'service' }] }],
      description: 'Services that this service calls directly to satisfy its contracts',
    },
    {
      name: 'downstreamServices',
      title: 'Downstream Consumer Services',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'service' }] }],
      description: 'Services that consume data or events emitted by this service',
    },
    {
      name: 'tags',
      title: 'Architecture Tags',
      type: 'array',
      of: [{ type: 'string' }],
      options: {
        layout: 'tags',
      },
    },
    {
      name: 'description',
      title: 'Architectural Summary',
      type: 'text',
      rows: 3,
    },
  ],
  preview: {
    select: {
      title: 'name',
      subtitle: 'ownerTeam',
      tier: 'serviceTier',
      status: 'deploymentStatus',
    },
    prepare({ title, subtitle, tier, status }: any) {
      return {
        title: title || 'Unnamed Service',
        subtitle: `${subtitle || 'No team'} | ${tier} | Status: ${status}`,
      };
    },
  },
};

export default serviceSchema;
