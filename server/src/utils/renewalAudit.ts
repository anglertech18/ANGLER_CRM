import { prisma } from '../lib/prisma';

interface AuditParams {
  accountId: number;
  entityType: string;
  entityId: number;
  action: string;
  oldValue?: string;
  newValue?: string;
  performedById: number;
  ip?: string;
}

export async function logAudit(params: AuditParams): Promise<void> {
  try {
    await (prisma as any).renewalAuditLog.create({
      data: {
        renewal_account_id: params.accountId,
        entity_type: params.entityType,
        entity_id: params.entityId,
        action: params.action,
        old_value: params.oldValue ?? null,
        new_value: params.newValue ?? null,
        performed_by_id: params.performedById,
        ip_address: params.ip ?? null,
      },
    });
  } catch (err) {
    // Audit failures must never crash the main transaction
    console.error('[RenewalAudit] Failed to write audit log:', err);
  }
}
