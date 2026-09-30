import { SetMetadata } from '@nestjs/common';

export const AUDIT_LOG_ENTITY_KEY = 'audit_log_entity';

/**
 * Tandai endpoint mutasi (POST/PATCH/PUT/DELETE) supaya otomatis dicatat ke
 * tabel audit_logs oleh AuditLogInterceptor (global — lihat main.ts).
 *
 * Action (CREATE/UPDATE/DELETE) diturunkan otomatis dari HTTP method, jadi
 * cukup sebutkan nama entity-nya saja: @AuditLog('Area'), @AuditLog('Equipment').
 *
 * JANGAN pakai di endpoint yang membawa data sensitif di request body tanpa
 * memastikan field itu ada di daftar redaksi (lihat redact-sensitive.util.ts)
 * — mis. password, token.
 */
export const AuditLog = (entityType: string) => SetMetadata(AUDIT_LOG_ENTITY_KEY, entityType);
