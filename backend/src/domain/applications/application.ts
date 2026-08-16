import { z } from "zod";

import { DomainConflictError, DomainValidationError } from "../errors.js";

export const applicationStatuses = [
  "saved",
  "applied",
  "online_assessment",
  "recruiter_screen",
  "technical_screen",
  "technical_screen_2",
  "technical_screen_3",
  "technical_screen_4",
  "onsite",
  "offer",
  "rejected",
  "ghosted",
  "withdrawn",
  "kiv",
] as const;

export type ApplicationStatus = (typeof applicationStatuses)[number];
const applicationStatusSet: ReadonlySet<string> = new Set(applicationStatuses);

const nullableString = z.string().nullable().optional();
const nullableDate = z.iso
  .datetime({ offset: true })
  .transform((value) => new Date(value))
  .nullable()
  .optional();

export const createApplicationInputSchema = z.strictObject({
  company_id: z.string().default(""),
  resume_version_id: nullableString,
  title: z.string().default(""),
  role_track: z.string().default(""),
  role_tracks: z.array(z.string()).nullable().optional(),
  source: nullableString,
  status: nullableString,
  location: nullableString,
  employment_type: nullableString,
  job_url: nullableString,
  portal_account: nullableString,
  portal_password: nullableString,
  applied_at: nullableDate,
  deadline_at: nullableDate,
  notes: nullableString,
});

export const updateApplicationInputSchema = z.strictObject({
  company_id: nullableString,
  resume_version_id: nullableString,
  title: nullableString,
  role_track: nullableString,
  role_tracks: z.array(z.string()).nullable().optional(),
  status: nullableString,
  source: nullableString,
  location: nullableString,
  employment_type: nullableString,
  job_url: nullableString,
  portal_account: nullableString,
  portal_password: nullableString,
  applied_at: nullableDate,
  deadline_at: nullableDate,
  notes: nullableString,
});

export const changeApplicationStatusInputSchema = z.strictObject({
  status: z.string().default(""),
  received_at: nullableDate,
  completed_at: nullableDate,
});

export type CreateApplicationInput = z.infer<
  typeof createApplicationInputSchema
>;
export type UpdateApplicationInput = z.infer<
  typeof updateApplicationInputSchema
>;
export type ChangeApplicationStatusInput = z.infer<
  typeof changeApplicationStatusInputSchema
>;

export interface Application {
  id: string;
  companyId: string;
  resumeVersionId: string | null;
  title: string;
  roleTrack: string;
  roleTracks: string[];
  source: string | null;
  status: string;
  location: string | null;
  employmentType: string | null;
  jobUrl: string | null;
  portalAccount: string | null;
  portalPassword: string | null;
  appliedAt: Date | null;
  deadlineAt: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditLog {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  oldValue: unknown;
  newValue: unknown;
  createdAt: Date;
}

export interface ApplicationPage {
  items: Application[];
  total: number;
  limit: number;
  offset: number;
}
export interface AuditLogInput {
  entityType: string;
  entityId: string;
  action: string;
  oldValue?: unknown;
  newValue?: unknown;
}

export interface ApplicationsRepository {
  create: (input: CreateApplicationInput) => Promise<Application>;
  list: () => Promise<Application[]>;
  listPage: (limit: number, offset: number) => Promise<ApplicationPage>;
  get: (id: string) => Promise<Application>;
  update: (id: string, input: UpdateApplicationInput) => Promise<Application>;
  updateStatusWithAudit: (
    id: string,
    status: string,
    audit: AuditLogInput,
  ) => Promise<Application>;
  createAudit: (input: AuditLogInput) => Promise<AuditLog>;
  listAuditLogs: (entityType: string, entityId: string) => Promise<AuditLog[]>;
  delete: (id: string) => Promise<void>;
}

export interface ApplicationsService {
  create: (input: CreateApplicationInput) => Promise<Application>;
  list: () => Promise<Application[]>;
  listPage: (limit: number, offset: number) => Promise<ApplicationPage>;
  get: (id: string) => Promise<Application>;
  update: (id: string, input: UpdateApplicationInput) => Promise<Application>;
  changeStatus: (
    id: string,
    input: ChangeApplicationStatusInput,
  ) => Promise<Application>;
  listAuditLogs: (id: string) => Promise<AuditLog[]>;
  delete: (id: string) => Promise<void>;
}

const transitions: Record<ApplicationStatus, readonly ApplicationStatus[]> = {
  saved: ["applied", "withdrawn", "kiv"],
  applied: [
    "online_assessment",
    "recruiter_screen",
    "technical_screen",
    "rejected",
    "ghosted",
    "withdrawn",
    "kiv",
  ],
  online_assessment: [
    "recruiter_screen",
    "technical_screen",
    "rejected",
    "ghosted",
    "withdrawn",
    "kiv",
  ],
  recruiter_screen: [
    "online_assessment",
    "technical_screen",
    "rejected",
    "ghosted",
    "withdrawn",
    "kiv",
  ],
  technical_screen: [
    "technical_screen_2",
    "onsite",
    "rejected",
    "ghosted",
    "withdrawn",
    "kiv",
  ],
  technical_screen_2: [
    "technical_screen_3",
    "onsite",
    "rejected",
    "ghosted",
    "withdrawn",
    "kiv",
  ],
  technical_screen_3: [
    "technical_screen_4",
    "onsite",
    "rejected",
    "ghosted",
    "withdrawn",
    "kiv",
  ],
  technical_screen_4: ["onsite", "rejected", "ghosted", "withdrawn", "kiv"],
  onsite: ["offer", "rejected", "ghosted", "withdrawn", "kiv"],
  offer: ["withdrawn", "rejected", "ghosted", "kiv"],
  rejected: [
    "saved",
    "applied",
    "online_assessment",
    "recruiter_screen",
    "technical_screen",
    "technical_screen_2",
    "technical_screen_3",
    "technical_screen_4",
    "onsite",
    "offer",
    "ghosted",
    "withdrawn",
    "kiv",
  ],
  ghosted: [
    "applied",
    "online_assessment",
    "recruiter_screen",
    "technical_screen",
    "technical_screen_2",
    "technical_screen_3",
    "technical_screen_4",
    "onsite",
    "offer",
    "rejected",
    "withdrawn",
    "kiv",
  ],
  kiv: [
    "saved",
    "applied",
    "online_assessment",
    "recruiter_screen",
    "technical_screen",
    "technical_screen_2",
    "technical_screen_3",
    "technical_screen_4",
    "onsite",
    "offer",
    "rejected",
    "ghosted",
    "withdrawn",
  ],
  withdrawn: [],
};

const receivedDateStatuses = new Set([
  "online_assessment",
  "recruiter_screen",
  "technical_screen",
  "technical_screen_2",
  "technical_screen_3",
  "technical_screen_4",
  "onsite",
  "offer",
  "rejected",
]);
const completionDateStatuses = new Set([
  "online_assessment",
  "technical_screen",
  "technical_screen_2",
  "technical_screen_3",
  "technical_screen_4",
  "onsite",
]);

export function createApplicationsService(
  repository: ApplicationsRepository,
): ApplicationsService {
  return {
    async create(input) {
      requireTitle(input.title);
      if (
        input.role_track.trim() === "" &&
        (input.role_tracks?.length ?? 0) === 0
      ) {
        throw new DomainValidationError("application track is required");
      }
      if (input.status != null) requireStatus(input.status);
      return repository.create(input);
    },
    list: () => repository.list(),
    get: (id) => repository.get(id),
    delete: (id) => repository.delete(id),
    listPage(limit, offset) {
      const safeLimit = limit < 1 ? 25 : Math.min(limit, 100);
      return repository.listPage(safeLimit, Math.max(offset, 0));
    },
    async update(id, input) {
      if (input.title != null) requireTitle(input.title);
      const roleTracks = input.role_tracks ?? [];
      if (
        roleTracks.length > 0 &&
        !roleTracks.some((track) => track.trim() !== "")
      ) {
        throw new DomainValidationError("application track is required");
      }
      if (input.status != null) requireStatus(input.status);
      return repository.update(id, input);
    },
    async changeStatus(id, input) {
      const {
        status,
        received_at: receivedAt,
        completed_at: completedAt,
      } = input;
      if (receivedAt != null && completedAt != null && completedAt < receivedAt)
        invalidDates();
      if (
        (receivedAt != null && !receivedDateStatuses.has(status)) ||
        (completedAt != null && !completionDateStatuses.has(status))
      )
        invalidDates();
      const current = await repository.get(id);
      if (current.status === status) {
        if (receivedAt != null || completedAt != null) {
          await repository.createAudit(
            statusAudit(
              id,
              "status_dates_recorded",
              status,
              undefined,
              receivedAt,
              completedAt,
            ),
          );
        }
        return current;
      }
      validateTransition(current.status, status);
      return repository.updateStatusWithAudit(
        id,
        status,
        statusAudit(
          id,
          "status_changed",
          status,
          current.status,
          receivedAt,
          completedAt,
        ),
      );
    },
    listAuditLogs: (id) => repository.listAuditLogs("application", id),
  };
}

function requireTitle(title: string): void {
  if (title.trim() === "")
    throw new DomainValidationError("application title is required");
}
function requireStatus(status: string): asserts status is ApplicationStatus {
  if (!isApplicationStatus(status))
    throw new DomainValidationError("invalid application status");
}
function invalidDates(): never {
  throw new DomainValidationError(
    "status completion date cannot be before received date",
  );
}

export function validateTransition(from: string, to: string): void {
  if (!isApplicationStatus(from))
    throw new DomainValidationError(`invalid application status: ${from}`);
  if (!isApplicationStatus(to))
    throw new DomainValidationError(`invalid application status: ${to}`);
  if (!transitions[from].includes(to))
    throw new DomainConflictError(
      `invalid application status transition: ${from} -> ${to}`,
    );
}

function isApplicationStatus(status: string): status is ApplicationStatus {
  return applicationStatusSet.has(status);
}

function statusAudit(
  id: string,
  action: string,
  status: string,
  oldStatus?: string,
  receivedAt?: Date | null,
  completedAt?: Date | null,
): AuditLogInput {
  const newValue: Record<string, string> = { status };
  if (receivedAt != null) newValue.received_at = auditDate(receivedAt);
  if (completedAt != null) newValue.completed_at = auditDate(completedAt);
  return {
    entityType: "application",
    entityId: id,
    action,
    ...(oldStatus === undefined ? {} : { oldValue: { status: oldStatus } }),
    newValue,
  };
}

function auditDate(value: Date): string {
  return value.toISOString().replace(/\.\d{3}Z$/, "Z");
}
