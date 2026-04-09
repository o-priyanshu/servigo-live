import type { AdminAuditLog } from "@/lib/admin/types";
import { seedAuditLogs } from "@/lib/admin/mock-data";

const auditStore: AdminAuditLog[] = [...seedAuditLogs];

export function listAuditLogs(limit = 20): AdminAuditLog[] {
  return [...auditStore]
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, limit);
}

export function appendAuditLog(entry: Omit<AdminAuditLog, "id" | "createdAt">): AdminAuditLog {
  const next: AdminAuditLog = {
    id: `log-${Date.now()}`,
    createdAt: new Date().toISOString(),
    ...entry,
  };
  auditStore.unshift(next);
  return next;
}

