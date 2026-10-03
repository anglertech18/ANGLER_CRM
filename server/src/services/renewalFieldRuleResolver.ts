import { prisma } from '../lib/prisma';

/**
 * Field configuration interface for service-specific field behavior
 */
export interface FieldConfig {
  visible: boolean;
  required: boolean;
  label: string;
}

/**
 * Complete field rule set for a Service Master
 */
export interface ServiceFieldRules {
  identifier: FieldConfig;
  provider: FieldConfig;
  serverName: FieldConfig;
  planName: FieldConfig;
  loginUsername: FieldConfig;
  quantity: FieldConfig;
}

/**
 * Resolve field configuration for a specific Service Master
 * Precedence: Service Master flags → Global defaults
 * 
 * NOTE: This resolver uses current schema fields and is backward compatible.
 * New fields (supports_server_name, requires_provider, etc.) will be used
 * once the migration is applied. Until then, it uses sensible defaults.
 * 
 * Future enhancement: Add parent company override table if needed
 */
export async function resolveServiceFieldRules(
  serviceMasterId: number,
  companyId?: number
): Promise<ServiceFieldRules> {
  const serviceMaster = await prisma.renewalServiceMaster.findUnique({
    where: { id: serviceMasterId },
    select: {
      name: true,
      identifier_label: true,
      requires_identifier: true,
      supports_provider: true,
      requires_provider: true,
      supports_server_name: true,
      requires_server_name: true,
      supports_plan_name: true,
      requires_plan_name: true,
      supports_login_username: true,
      requires_login_username: true,
      supports_quantity: true,
      requires_quantity: true,
      quantity_label: true,
    }
  });

  if (!serviceMaster) {
    throw new Error(`Service Master with ID ${serviceMasterId} not found`);
  }

  return {
    identifier: {
      visible: true,
      required: serviceMaster.requires_identifier,
      label: serviceMaster.identifier_label || 'Identifier'
    },
    provider: {
      visible: serviceMaster.supports_provider,
      required: serviceMaster.requires_provider,
      label: 'Service Provider'
    },
    serverName: {
      visible: serviceMaster.supports_server_name,
      required: serviceMaster.requires_server_name,
      label: 'Server Name'
    },
    planName: {
      visible: serviceMaster.supports_plan_name,
      required: serviceMaster.requires_plan_name,
      label: 'Service Plan'
    },
    loginUsername: {
      visible: serviceMaster.supports_login_username,
      required: serviceMaster.requires_login_username,
      label: 'Login User Name'
    },
    quantity: {
      visible: serviceMaster.supports_quantity,
      required: serviceMaster.requires_quantity,
      label: serviceMaster.quantity_label || 'Quantity'
    }
  };
}

/**
 * Validate service instance data against resolved field rules
 * Returns validation errors for missing required fields
 */
export async function validateServiceInstance(
  serviceMasterId: number,
  data: {
    identifier?: string;
    provider_id?: number;
    server_name?: string;
    plan_name?: string;
    login_username?: string;
    quantity?: number;
  }
): Promise<{ valid: boolean; errors: string[] }> {
  const rules = await resolveServiceFieldRules(serviceMasterId);
  const errors: string[] = [];

  if (rules.identifier.required && !data.identifier) {
    errors.push(rules.identifier.label + ' is required');
  }

  if (rules.provider.required && !data.provider_id) {
    errors.push(rules.provider.label + ' is required');
  }

  if (rules.serverName.required && !data.server_name) {
    errors.push(rules.serverName.label + ' is required');
  }

  if (rules.planName.required && !data.plan_name) {
    errors.push(rules.planName.label + ' is required');
  }

  if (rules.loginUsername.required && !data.login_username) {
    errors.push(rules.loginUsername.label + ' is required');
  }

  if (rules.quantity.required && (!data.quantity || data.quantity <= 0)) {
    errors.push(rules.quantity.label + ' is required and must be greater than 0');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get all Service Masters for a specific parent company
 * Future: Implement Company → Service Master mapping table
 */
export async function getServiceMastersForCompany(companyId: number) {
  return prisma.renewalServiceMaster.findMany({
    where: {
      is_active: true,
      OR: [
        { company_id: companyId },
        { company_id: null },
      ],
    } as any,
    orderBy: { name: 'asc' }
  });
}
