import { randomBytes } from "node:crypto";
import { count } from "drizzle-orm";

import type { Database } from "./client.js";
import {
  applicationRoleTracks,
  applications,
  companies,
  contacts,
  interviewRounds,
  jobDescriptions,
  reminders,
  resumeVersions,
} from "./schema.js";
import {
  applicationSeeds,
  companySeeds,
  contactSeeds,
  jobDescriptionTemplates,
  keywordsByTrack,
  reminderSeeds,
  resumeSeeds,
} from "./seed-data.js";

export interface SeedSummary {
  companies: number;
  resumeVersions: number;
  applications: number;
  jobDescriptions: number;
  contacts: number;
  interviewRounds: number;
  reminders: number;
}

export async function seedDemoData(
  database: Database,
): Promise<SeedSummary | null> {
  const [existing] = await database.select({ value: count() }).from(companies);
  if ((existing?.value ?? 0) > 0) return null;

  return database.transaction(async (tx) => {
    const companyRows = await tx
      .insert(companies)
      .values(
        companySeeds.map(([name, industry, location]) => ({
          name,
          website: `https://${slug(name)}.example.com`,
          industry,
          location,
        })),
      )
      .returning();
    const resumeRows = await tx
      .insert(resumeVersions)
      .values(
        resumeSeeds.map((resume) => ({ ...resume, tags: [...resume.tags] })),
      )
      .returning();

    const now = Date.now();
    const applicationValues = Array.from({ length: 200 }, (_, index) => {
      const template = requiredAt(
        applicationSeeds,
        index % applicationSeeds.length,
      );
      const company = requiredAt(companyRows, index % companyRows.length);
      const resume = requiredAt(resumeRows, index % resumeRows.length);
      const [baseTitle, roleTrack, source, status, employmentType] = template;
      return {
        companyId: company.id,
        resumeVersionId: resume.id,
        title:
          index < applicationSeeds.length
            ? baseTitle
            : `${baseTitle} (${String(index)})`,
        roleTrack,
        source,
        status,
        location: index % 5 === 0 ? "Remote" : company.location,
        employmentType,
        jobUrl: `https://jobs.example.com/${String(index + 1)}`,
        appliedAt: new Date(
          now - 30 * 86_400_000 + index * 21_600_000,
        ),
      };
    });
    const applicationRows = await tx
      .insert(applications)
      .values(applicationValues)
      .returning();
    await tx.insert(applicationRoleTracks).values(
      applicationRows.map((application) => ({
        applicationId: application.id,
        roleTrack: application.roleTrack,
      })),
    );

    const descriptionRows = await tx
      .insert(jobDescriptions)
      .values(
        applicationRows.map((application, index) => {
          const track = normalizeTrack(application.roleTrack);
          const templates = jobDescriptionTemplates[track];
          return {
            applicationId: application.id,
            rawText: requiredAt(templates, index % templates.length),
            extractedKeywords: [...keywordsByTrack[track]],
          };
        }),
      )
      .returning();

    const contactRows = await tx
      .insert(contacts)
      .values(
        Array.from({ length: 100 }, (_, index) => {
          const [baseName, role, relationship] = requiredAt(
            contactSeeds,
            index % contactSeeds.length,
          );
          const company = requiredAt(companyRows, index % companyRows.length);
          const cycle = Math.floor(index / contactSeeds.length) + 1;
          return {
            companyId: company.id,
            name: cycle === 1 ? baseName : `${baseName} ${String(cycle)}`,
            role,
            relationship,
            email: `${slug(baseName)}.${String(index + 1)}@${slug(company.name)}.example`,
          };
        }),
      )
      .returning();

    const advanced = applicationRows.filter(({ status }) =>
      ["recruiter_screen", "technical_screen", "onsite", "offer"].includes(
        status,
      ),
    );
    const roundTypes = [
      "recruiter",
      "online_assessment",
      "technical",
      "system_design",
      "behavioral",
      "final",
    ];
    const interviewRows = await tx
      .insert(interviewRounds)
      .values(
        Array.from({ length: Math.min(50, advanced.length) }, (_, index) => ({
          applicationId: requiredAt(advanced, index).id,
          roundType: requiredAt(roundTypes, index % roundTypes.length),
          scheduledAt: new Date(now - (50 - index) * 86_400_000),
          interviewer: requiredAt(contactRows, index % contactRows.length).name,
          notes: `Round ${String(index + 1)} interview preparation notes.`,
          outcome: requiredAt(["passed", "failed", "pending"], index % 3),
        })),
      )
      .returning();

    const reminderRows = await tx
      .insert(reminders)
      .values(
        Array.from({ length: 50 }, (_, index) => {
          const [title, description] = requiredAt(
            reminderSeeds,
            index % reminderSeeds.length,
          );
          return {
            applicationId: requiredAt(applicationRows, index).id,
            title,
            description,
            dueAt: new Date(now + (index + 1) * 86_400_000),
            idempotencyKey: randomBytes(16).toString("hex"),
          };
        }),
      )
      .returning();

    return {
      companies: companyRows.length,
      resumeVersions: resumeRows.length,
      applications: applicationRows.length,
      jobDescriptions: descriptionRows.length,
      contacts: contactRows.length,
      interviewRounds: interviewRows.length,
      reminders: reminderRows.length,
    };
  });
}

function normalizeTrack(track: string): keyof typeof jobDescriptionTemplates {
  return track === "backend" || track === "ai" || track === "quant"
    ? track
    : "general";
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 30);
}

function requiredAt<T>(values: readonly T[], index: number): T {
  const value = values[index];
  if (value === undefined)
    throw new Error(`seed value missing at index ${String(index)}`);
  return value;
}
