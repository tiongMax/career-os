import { and, count, desc, eq, inArray } from "drizzle-orm";

import type {
  Application,
  ApplicationsRepository,
  AuditLog,
  AuditLogInput,
} from "../../domain/applications/application.js";
import { DomainValidationError } from "../../domain/errors.js";
import type { Database } from "../../infrastructure/postgres.js";
import { EntityNotFoundError } from "./errors.js";
import { applicationRoleTracks, applications, auditLogs } from "./schema.js";

type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
type Executor = Database | Transaction;

const applicationSelection = {
  id: applications.id,
  companyId: applications.companyId,
  resumeVersionId: applications.resumeVersionId,
  title: applications.title,
  roleTrack: applications.roleTrack,
  source: applications.source,
  status: applications.status,
  location: applications.location,
  employmentType: applications.employmentType,
  jobUrl: applications.jobUrl,
  portalAccount: applications.portalAccount,
  portalPassword: applications.portalPassword,
  appliedAt: applications.appliedAt,
  deadlineAt: applications.deadlineAt,
  notes: applications.notes,
  createdAt: applications.createdAt,
  updatedAt: applications.updatedAt,
};

type ApplicationWithoutTracks = Omit<Application, "roleTracks">;

export function createApplicationsRepository(
  database: Database,
): ApplicationsRepository {
  return {
    async create(input) {
      const tracks = normalizeTracks(input.role_track, input.role_tracks ?? []);
      if (tracks.length === 0)
        throw new DomainValidationError("application track is required");
      const primaryTrack = first(tracks);

      return database.transaction(async (tx) => {
        const [application] = await tx
          .insert(applications)
          .values({
            companyId: input.company_id,
            resumeVersionId: input.resume_version_id ?? null,
            title: input.title,
            roleTrack: primaryTrack,
            source: input.source ?? null,
            status: input.status ?? "saved",
            location: input.location ?? null,
            employmentType: input.employment_type ?? null,
            jobUrl: input.job_url ?? null,
            portalAccount: input.portal_account ?? null,
            portalPassword: input.portal_password ?? null,
            appliedAt: input.applied_at ?? null,
            deadlineAt: input.deadline_at ?? null,
            notes: input.notes ?? null,
          })
          .returning(applicationSelection);
        if (application === undefined)
          throw new Error("application insert returned no row");
        await replaceTracks(tx, application.id, tracks);
        return { ...application, roleTracks: tracks };
      });
    },

    async list() {
      const rows = await database
        .select(applicationSelection)
        .from(applications)
        .orderBy(desc(applications.createdAt))
        .limit(200);
      return attachTracks(database, rows);
    },

    async listPage(limit, offset) {
      const [rows, totals] = await Promise.all([
        database
          .select(applicationSelection)
          .from(applications)
          .orderBy(desc(applications.createdAt))
          .limit(limit)
          .offset(offset),
        database.select({ value: count() }).from(applications),
      ]);
      return {
        items: await attachTracks(database, rows),
        total: totals[0]?.value ?? 0,
        limit,
        offset,
      };
    },

    async get(id) {
      const [application] = await database
        .select(applicationSelection)
        .from(applications)
        .where(eq(applications.id, id))
        .limit(1);
      if (application === undefined)
        throw new EntityNotFoundError("application");
      return first(await attachTracks(database, [application]));
    },

    async update(id, input) {
      return database.transaction(async (tx) => {
        const values: Partial<typeof applications.$inferInsert> = {
          updatedAt: new Date(),
        };
        if (input.company_id != null) values.companyId = input.company_id;
        if (input.resume_version_id != null)
          values.resumeVersionId = input.resume_version_id;
        if (input.title != null) values.title = input.title;
        if (input.role_track != null) values.roleTrack = input.role_track;
        if (input.status != null) values.status = input.status;
        if (input.source != null) values.source = input.source;
        if (input.location != null) values.location = input.location;
        if (input.employment_type != null)
          values.employmentType = input.employment_type;
        if (input.job_url != null) values.jobUrl = input.job_url;
        if (input.portal_account != null)
          values.portalAccount = input.portal_account;
        if (input.portal_password != null)
          values.portalPassword = input.portal_password;
        if (input.applied_at != null) values.appliedAt = input.applied_at;
        if (input.deadline_at != null) values.deadlineAt = input.deadline_at;
        if (input.notes != null) values.notes = input.notes;

        const requestedTracks = input.role_tracks ?? [];
        let tracks: string[] | undefined;
        if (requestedTracks.length > 0) {
          tracks = normalizeTracks("", requestedTracks);
          if (tracks.length === 0)
            throw new DomainValidationError("application track is required");
          values.roleTrack = first(tracks);
        }

        const [application] = await tx
          .update(applications)
          .set(values)
          .where(eq(applications.id, id))
          .returning(applicationSelection);
        if (application === undefined)
          throw new EntityNotFoundError("application");
        if (tracks !== undefined) await replaceTracks(tx, id, tracks);
        return first(await attachTracks(tx, [application]));
      });
    },

    async updateStatusWithAudit(id, status, audit) {
      return database.transaction(async (tx) => {
        const [application] = await tx
          .update(applications)
          .set({ status, updatedAt: new Date() })
          .where(eq(applications.id, id))
          .returning(applicationSelection);
        if (application === undefined)
          throw new EntityNotFoundError("application");
        await insertAudit(tx, audit);
        return first(await attachTracks(tx, [application]));
      });
    },

    createAudit: (input) => insertAudit(database, input),

    async listAuditLogs(entityType, entityId) {
      return database
        .select()
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.entityType, entityType),
            eq(auditLogs.entityId, entityId),
          ),
        )
        .orderBy(desc(auditLogs.createdAt));
    },

    async delete(id) {
      const deleted = await database
        .delete(applications)
        .where(eq(applications.id, id))
        .returning({ id: applications.id });
      if (deleted.length === 0) throw new EntityNotFoundError("application");
    },
  };
}

async function attachTracks(
  executor: Executor,
  rows: ApplicationWithoutTracks[],
): Promise<Application[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((row) => row.id);
  const trackRows = await executor
    .select({
      applicationId: applicationRoleTracks.applicationId,
      roleTrack: applicationRoleTracks.roleTrack,
    })
    .from(applicationRoleTracks)
    .where(inArray(applicationRoleTracks.applicationId, ids))
    .orderBy(applicationRoleTracks.roleTrack);
  const grouped = new Map<string, string[]>();
  for (const row of trackRows)
    grouped.set(row.applicationId, [
      ...(grouped.get(row.applicationId) ?? []),
      row.roleTrack,
    ]);
  return rows.map((row) => ({
    ...row,
    roleTracks: grouped.get(row.id) ?? normalizeTracks(row.roleTrack, []),
  }));
}

async function replaceTracks(
  executor: Executor,
  applicationId: string,
  tracks: string[],
): Promise<void> {
  await executor
    .delete(applicationRoleTracks)
    .where(eq(applicationRoleTracks.applicationId, applicationId));
  if (tracks.length > 0)
    await executor
      .insert(applicationRoleTracks)
      .values(tracks.map((roleTrack) => ({ applicationId, roleTrack })));
}

async function insertAudit(
  executor: Executor,
  input: AuditLogInput,
): Promise<AuditLog> {
  const [audit] = await executor
    .insert(auditLogs)
    .values({
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      oldValue: input.oldValue ?? null,
      newValue: input.newValue ?? null,
    })
    .returning();
  if (audit === undefined) throw new Error("audit log insert returned no row");
  return audit;
}

export function normalizeTracks(
  primary: string,
  tracks: readonly string[],
): string[] {
  const normalized: string[] = [];
  const seen = new Set<string>();
  for (const raw of tracks) {
    const track = raw.trim().toLowerCase();
    if (track !== "" && !seen.has(track)) {
      seen.add(track);
      normalized.push(track);
    }
  }
  if (normalized.length === 0) {
    const track = primary.trim().toLowerCase();
    if (track !== "") normalized.push(track);
  }
  return normalized;
}

function first<T>(values: readonly T[]): T {
  const value = values[0];
  if (value === undefined) throw new Error("expected at least one value");
  return value;
}
