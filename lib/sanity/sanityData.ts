/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Sanity Content Lake Graph Model & Seed Database
 * ChronoGraph - Autonomous Cross-System Breaking-Change Sentinel
 */

export interface SanityService {
  _id: string;
  _type: 'service';
  name: string;
  slug: { current: string };
  serviceTier: 'tier-0-mission-critical' | 'tier-1-business-critical' | 'tier-2-standard' | 'tier-3-internal';
  ownerTeam: string;
  onCallSlack: string;
  repositoryUrl: string;
  protocol: 'rest' | 'graphql' | 'grpc' | 'sanity-groq' | 'kafka';
  environment: 'production' | 'staging' | 'development';
  contractVersion: string;
  deploymentStatus: 'healthy' | 'degraded' | 'blocked-by-sentinel' | 'maintenance';
  endpointIds: string[];
  upstreamServiceIds: string[];
  downstreamServiceIds: string[];
  tags: string[];
  description: string;
}

export interface SanityEndpoint {
  _id: string;
  _type: 'apiEndpoint';
  name: string;
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'GROQ_QUERY' | 'EVENT_STREAM';
  serviceId: string;
  description: string;
  isPublic: boolean;
  slaUptimeTarget: number;
  deprecated: boolean;
  deprecationNotice?: string;
  fieldContracts: {
    fieldName: string;
    jsonPath: string;
    dataType: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'reference' | 'null';
    required: boolean;
    nullable: boolean;
    sensitivity: 'public' | 'internal' | 'pii' | 'pci-dss' | 'restricted';
    description?: string;
  }[];
  consumers: {
    consumerServiceId: string;
    consumerTeam: string;
    clientVersion: string;
    criticality: 'critical' | 'high' | 'medium' | 'low';
    consumedFields: string[];
    trafficPercentage: number;
    contactEmail: string;
  }[];
}

export const INITIAL_SERVICES: SanityService[] = [
  {
    _id: 'srv_customer_profile',
    _type: 'service',
    name: 'Customer Identity & Profile Lake',
    slug: { current: 'customer-profile-lake' },
    serviceTier: 'tier-0-mission-critical',
    ownerTeam: 'identity-platform',
    onCallSlack: '#alerts-identity',
    repositoryUrl: 'https://github.com/org/customer-profile-lake',
    protocol: 'sanity-groq',
    environment: 'production',
    contractVersion: '3.2.0',
    deploymentStatus: 'healthy',
    endpointIds: ['ep_get_customer_profile', 'ep_stream_customer_events'],
    upstreamServiceIds: [],
    downstreamServiceIds: ['srv_billing_core', 'srv_auth_vault'],
    tags: ['sanity-lake', 'groq', 'gdpr-sensitive', 'tier-0'],
    description: 'Central Sanity Content Lake storing customer documents, profile states, and GDPR consents.',
  },
  {
    _id: 'srv_billing_core',
    _type: 'service',
    name: 'Billing & Invoicing Engine',
    slug: { current: 'billing-invoicing-engine' },
    serviceTier: 'tier-0-mission-critical',
    ownerTeam: 'checkout-billing',
    onCallSlack: '#alerts-billing',
    repositoryUrl: 'https://github.com/org/billing-invoicing-engine',
    protocol: 'rest',
    environment: 'production',
    contractVersion: '2.4.1',
    deploymentStatus: 'healthy',
    endpointIds: ['ep_customer_billing_profile', 'ep_generate_invoice'],
    upstreamServiceIds: ['srv_customer_profile'],
    downstreamServiceIds: ['srv_order_orchestrator', 'srv_financial_audit', 'srv_mobile_bff'],
    tags: ['stripe', 'payments', 'pci-dss', 'mission-critical'],
    description: 'Processes credit card tokens, recurring subscriptions, invoice schemas, and tax calculations.',
  },
  {
    _id: 'srv_order_orchestrator',
    _type: 'service',
    name: 'Order Orchestration Hub',
    slug: { current: 'order-orchestrator' },
    serviceTier: 'tier-1-business-critical',
    ownerTeam: 'order-platform',
    onCallSlack: '#alerts-orders',
    repositoryUrl: 'https://github.com/org/order-orchestrator',
    protocol: 'graphql',
    environment: 'production',
    contractVersion: '4.1.0',
    deploymentStatus: 'healthy',
    endpointIds: ['ep_create_order_mutation'],
    upstreamServiceIds: ['srv_billing_core'],
    downstreamServiceIds: ['srv_warehouse_fulfillment', 'srv_notification_dispatcher'],
    tags: ['graphql-subgraph', 'checkout', 'orders'],
    description: 'Federated GraphQL subgraph orchestrating checkout carts, order states, and payment capture.',
  },
  {
    _id: 'srv_warehouse_fulfillment',
    _type: 'service',
    name: 'Warehouse Logistics & Inventory',
    slug: { current: 'warehouse-logistics' },
    serviceTier: 'tier-1-business-critical',
    ownerTeam: 'supply-chain-eng',
    onCallSlack: '#alerts-logistics',
    repositoryUrl: 'https://github.com/org/warehouse-logistics',
    protocol: 'kafka',
    environment: 'production',
    contractVersion: '1.9.4',
    deploymentStatus: 'healthy',
    endpointIds: ['ep_fulfillment_event_stream'],
    upstreamServiceIds: ['srv_order_orchestrator'],
    downstreamServiceIds: ['srv_carrier_gateway'],
    tags: ['kafka', 'inventory', 'physical-fulfillment'],
    description: 'Event-driven ingestion of confirmed orders for pick-and-pack routing and barcode dispatch.',
  },
  {
    _id: 'srv_carrier_gateway',
    _type: 'service',
    name: 'Global Carrier Logistics Gateway',
    slug: { current: 'carrier-gateway' },
    serviceTier: 'tier-2-standard',
    ownerTeam: 'shipping-partners',
    onCallSlack: '#alerts-shipping',
    repositoryUrl: 'https://github.com/org/carrier-gateway',
    protocol: 'rest',
    environment: 'production',
    contractVersion: '1.2.0',
    deploymentStatus: 'healthy',
    endpointIds: ['ep_dispatch_manifest'],
    upstreamServiceIds: ['srv_warehouse_fulfillment'],
    downstreamServiceIds: [],
    tags: ['fedex', 'dhl', 'ups-api'],
    description: 'Third-party gateway dispatching international manifests and tracking IDs.',
  },
  {
    _id: 'srv_financial_audit',
    _type: 'service',
    name: 'Financial Ledger & SOX Audit Cron',
    slug: { current: 'financial-audit-ledger' },
    serviceTier: 'tier-1-business-critical',
    ownerTeam: 'fintech-compliance',
    onCallSlack: '#alerts-fintech',
    repositoryUrl: 'https://github.com/org/financial-audit-ledger',
    protocol: 'rest',
    environment: 'production',
    contractVersion: '2.0.0',
    deploymentStatus: 'healthy',
    endpointIds: ['ep_reconciliation_batch'],
    upstreamServiceIds: ['srv_billing_core'],
    downstreamServiceIds: [],
    tags: ['sox-compliance', 'tax-audit', 'immutable-ledger'],
    description: 'Ingests hourly invoice schemas for GAAP balance sheet reconciliation and tax authority filings.',
  },
  {
    _id: 'srv_notification_dispatcher',
    _type: 'service',
    name: 'Multi-Channel Notification Dispatcher',
    slug: { current: 'notification-dispatcher' },
    serviceTier: 'tier-2-standard',
    ownerTeam: 'growth-comms',
    onCallSlack: '#alerts-comms',
    repositoryUrl: 'https://github.com/org/notification-dispatcher',
    protocol: 'kafka',
    environment: 'production',
    contractVersion: '3.0.1',
    deploymentStatus: 'healthy',
    endpointIds: ['ep_send_transactional_email'],
    upstreamServiceIds: ['srv_order_orchestrator'],
    downstreamServiceIds: [],
    tags: ['sendgrid', 'twilio', 'push-notifications'],
    description: 'Dispatches real-time order receipts, SMS delivery alerts, and push updates.',
  },
  {
    _id: 'srv_mobile_bff',
    _type: 'service',
    name: 'Mobile App Backend-for-Frontend (BFF)',
    slug: { current: 'mobile-bff' },
    serviceTier: 'tier-1-business-critical',
    ownerTeam: 'mobile-guild',
    onCallSlack: '#alerts-mobile',
    repositoryUrl: 'https://github.com/org/mobile-bff',
    protocol: 'graphql',
    environment: 'production',
    contractVersion: '2.8.0',
    deploymentStatus: 'healthy',
    endpointIds: ['ep_mobile_dashboard_query'],
    upstreamServiceIds: ['srv_billing_core'],
    downstreamServiceIds: [],
    tags: ['ios', 'android', 'apollo-server'],
    description: 'Optimized GraphQL gateway serving the iOS and Android native checkout views.',
  },
];

export const INITIAL_ENDPOINTS: SanityEndpoint[] = [
  {
    _id: 'ep_customer_billing_profile',
    _type: 'apiEndpoint',
    name: 'Get Customer Invoicing & Payment Profile',
    path: '/v1/customers/:id/billing',
    method: 'GET',
    serviceId: 'srv_billing_core',
    description: 'Returns customer payment method tokens, active tax identifiers, and current subscription plan.',
    isPublic: false,
    slaUptimeTarget: 99.99,
    deprecated: false,
    fieldContracts: [
      {
        fieldName: 'customerId',
        jsonPath: 'data.customerId',
        dataType: 'string',
        required: true,
        nullable: false,
        sensitivity: 'internal',
        description: 'Unique customer identifier formatted as UUID or cus_xxx',
      },
      {
        fieldName: 'paymentMethodId',
        jsonPath: 'data.paymentMethodId',
        dataType: 'string',
        required: true,
        nullable: false,
        sensitivity: 'pci-dss',
        description: 'Vault token pointing to active Stripe/Braintree payment card',
      },
      {
        fieldName: 'subscriptionStatus',
        jsonPath: 'data.subscriptionStatus',
        dataType: 'string',
        required: true,
        nullable: false,
        sensitivity: 'public',
        description: 'Active tier enum: "active" | "past_due" | "canceled" | "trialing"',
      },
      {
        fieldName: 'currency',
        jsonPath: 'data.currency',
        dataType: 'string',
        required: true,
        nullable: false,
        sensitivity: 'public',
        description: 'ISO 4217 three-letter currency code (e.g. USD, EUR, GBP)',
      },
      {
        fieldName: 'taxId',
        jsonPath: 'data.taxId',
        dataType: 'string',
        required: false,
        nullable: true,
        sensitivity: 'internal',
        description: 'Optional VAT or EU tax registration number for B2B billing',
      },
      {
        fieldName: 'billingCycleAnchor',
        jsonPath: 'data.billingCycleAnchor',
        dataType: 'number',
        required: true,
        nullable: false,
        sensitivity: 'internal',
        description: 'Unix timestamp in seconds for the next invoice generation',
      },
    ],
    consumers: [
      {
        consumerServiceId: 'srv_order_orchestrator',
        consumerTeam: 'order-platform',
        clientVersion: 'v4.1.0',
        criticality: 'critical',
        consumedFields: ['customerId', 'paymentMethodId', 'subscriptionStatus', 'currency'],
        trafficPercentage: 65,
        contactEmail: 'orders-oncall@sentinel.internal',
      },
      {
        consumerServiceId: 'srv_financial_audit',
        consumerTeam: 'fintech-compliance',
        clientVersion: 'v2.0.0',
        criticality: 'high',
        consumedFields: ['customerId', 'taxId', 'currency', 'billingCycleAnchor'],
        trafficPercentage: 15,
        contactEmail: 'fintech-devs@sentinel.internal',
      },
      {
        consumerServiceId: 'srv_mobile_bff',
        consumerTeam: 'mobile-guild',
        clientVersion: 'v2.8.0',
        criticality: 'high',
        consumedFields: ['subscriptionStatus', 'currency', 'billingCycleAnchor'],
        trafficPercentage: 20,
        contactEmail: 'mobile-core@sentinel.internal',
      },
    ],
  },
  {
    _id: 'ep_generate_invoice',
    _type: 'apiEndpoint',
    name: 'Generate Finalized Tax Invoice',
    path: '/v2/invoices/generate',
    method: 'POST',
    serviceId: 'srv_billing_core',
    description: 'Calculates tax breakdown, applies promotional coupons, and writes finalized invoice to Sanity lake.',
    isPublic: false,
    slaUptimeTarget: 99.95,
    deprecated: false,
    fieldContracts: [
      {
        fieldName: 'invoiceId',
        jsonPath: 'payload.invoiceId',
        dataType: 'string',
        required: true,
        nullable: false,
        sensitivity: 'internal',
      },
      {
        fieldName: 'amountDue',
        jsonPath: 'payload.amountDue',
        dataType: 'number',
        required: true,
        nullable: false,
        sensitivity: 'public',
      },
      {
        fieldName: 'taxRate',
        jsonPath: 'payload.taxRate',
        dataType: 'number',
        required: true,
        nullable: false,
        sensitivity: 'internal',
      },
      {
        fieldName: 'lineItems',
        jsonPath: 'payload.lineItems',
        dataType: 'array',
        required: true,
        nullable: false,
        sensitivity: 'public',
      },
    ],
    consumers: [
      {
        consumerServiceId: 'srv_financial_audit',
        consumerTeam: 'fintech-compliance',
        clientVersion: 'v2.0.0',
        criticality: 'critical',
        consumedFields: ['invoiceId', 'amountDue', 'taxRate'],
        trafficPercentage: 100,
        contactEmail: 'fintech-devs@sentinel.internal',
      },
    ],
  },
  {
    _id: 'ep_create_order_mutation',
    _type: 'apiEndpoint',
    name: 'GraphQL Mutation: createOrder',
    path: 'mutation CreateOrder($input: OrderInput!)',
    method: 'POST',
    serviceId: 'srv_order_orchestrator',
    description: 'Creates cart order, validates stock, captures payment via billing service, and schedules warehouse dispatch.',
    isPublic: false,
    slaUptimeTarget: 99.99,
    deprecated: false,
    fieldContracts: [
      {
        fieldName: 'orderId',
        jsonPath: 'data.createOrder.orderId',
        dataType: 'string',
        required: true,
        nullable: false,
        sensitivity: 'public',
      },
      {
        fieldName: 'customerId',
        jsonPath: 'data.createOrder.customerId',
        dataType: 'string',
        required: true,
        nullable: false,
        sensitivity: 'internal',
      },
      {
        fieldName: 'totalAmount',
        jsonPath: 'data.createOrder.totalAmount',
        dataType: 'number',
        required: true,
        nullable: false,
        sensitivity: 'public',
      },
      {
        fieldName: 'items',
        jsonPath: 'data.createOrder.items',
        dataType: 'array',
        required: true,
        nullable: false,
        sensitivity: 'public',
      },
    ],
    consumers: [
      {
        consumerServiceId: 'srv_warehouse_fulfillment',
        consumerTeam: 'supply-chain-eng',
        clientVersion: 'v1.9.4',
        criticality: 'critical',
        consumedFields: ['orderId', 'items'],
        trafficPercentage: 100,
        contactEmail: 'warehouse-ops@sentinel.internal',
      },
      {
        consumerServiceId: 'srv_notification_dispatcher',
        consumerTeam: 'growth-comms',
        clientVersion: 'v3.0.1',
        criticality: 'medium',
        consumedFields: ['orderId', 'customerId', 'totalAmount'],
        trafficPercentage: 100,
        contactEmail: 'growth-comms@sentinel.internal',
      },
    ],
  },
];
