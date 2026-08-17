import type { FastifyPluginCallbackZod } from "fastify-type-provider-zod";
import { z } from "zod";

import {
  createJobDescriptionInputSchema,
  updateJobDescriptionInputSchema,
  type JobDescription,
  type JobDescriptionsService,
  type PrepContext,
  type ResumeMatchResult,
} from "./job-description.service.js";
import {
  applicationDTO,
  applicationResponseSchema,
  auditLogDTO,
  auditLogResponseSchema,
} from "../applications/application.routes.js";
import {
  companyDTO,
  companyResponseSchema,
} from "../companies/company.routes.js";
import {
  contactDTO,
  contactResponseSchema,
} from "../contacts/contact.routes.js";
import {
  interviewDTO,
  interviewResponseSchema,
} from "../interviews/interview.routes.js";
import {
  resumeVersionDTO,
  resumeVersionResponseSchema,
} from "../resumes/resume-version.routes.js";
import {
  errorResponseSchema,
  idParamsSchema,
  requireUUID,
} from "../../shared/http-schemas.js";

const compareParamsSchema = z.strictObject({
  id: z.string(),
  resumeVersionId: z.string(),
});
const jobDescriptionSchema = z.object({
  id: z.uuid(),
  application_id: z.uuid(),
  raw_text: z.string(),
  extracted_keywords: z.array(z.string()),
  ai_summary: z.string().optional(),
  created_at: z.iso.datetime(),
  updated_at: z.iso.datetime(),
});
const matchSchema = z.object({
  matched: z.array(z.string()),
  missing: z.array(z.string()),
  score: z.number(),
  compared_keywords: z.number().int(),
  evidence: z.array(
    z.object({ keyword: z.string(), source: z.string(), weight: z.number() }),
  ),
});
const recommendedSchema = z.object({
  resume_version: resumeVersionResponseSchema,
  matched: z.array(z.string()),
  missing: z.array(z.string()),
  score: z.number(),
});
const prepContextSchema = z.object({
  application: applicationResponseSchema,
  company: companyResponseSchema,
  job_description: jobDescriptionSchema.optional(),
  resume: resumeVersionResponseSchema.optional(),
  interviews: z.array(interviewResponseSchema),
  contacts: z.array(contactResponseSchema),
  audit_logs: z.array(auditLogResponseSchema),
});
const prepBriefSchema = z.object({
  role_summary: z.string(),
  key_gaps: z.array(z.string()),
  focus_areas: z.array(z.string()),
  talking_points: z.array(z.string()),
  generated_at: z.iso.datetime(),
});

export function jobDescriptionRoutes(
  service: JobDescriptionsService,
): FastifyPluginCallbackZod {
  return function registerJobDescriptionRoutes(app, _options, done) {
    app.post(
      "/applications/:id/job-description",
      {
        schema: {
          tags: ["Job descriptions"],
          summary: "Create job description",
          params: idParamsSchema,
          body: createJobDescriptionInputSchema,
          response: { 201: jobDescriptionSchema, 400: errorResponseSchema },
        },
      },
      async (request, reply) =>
        reply
          .status(201)
          .send(
            jobDescriptionDTO(
              await service.create(
                applicationId(request.params.id),
                request.body,
              ),
            ),
          ),
    );
    app.get(
      "/applications/:id/job-description",
      {
        schema: {
          tags: ["Job descriptions"],
          summary: "Get application job description",
          params: idParamsSchema,
          response: {
            200: jobDescriptionSchema,
            400: errorResponseSchema,
            404: errorResponseSchema,
          },
        },
      },
      async (request) =>
        jobDescriptionDTO(
          await service.getByApplication(applicationId(request.params.id)),
        ),
    );
    app.patch(
      "/job-descriptions/:id",
      {
        schema: {
          tags: ["Job descriptions"],
          summary: "Update job description",
          params: idParamsSchema,
          body: updateJobDescriptionInputSchema,
          response: {
            200: jobDescriptionSchema,
            400: errorResponseSchema,
            404: errorResponseSchema,
          },
        },
      },
      async (request) =>
        jobDescriptionDTO(
          await service.update(descriptionId(request.params.id), request.body),
        ),
    );
    app.post(
      "/job-descriptions/:id/extract-keywords",
      {
        schema: {
          tags: ["Job descriptions"],
          summary: "Extract job description keywords",
          params: idParamsSchema,
          response: {
            200: jobDescriptionSchema,
            400: errorResponseSchema,
            404: errorResponseSchema,
          },
        },
      },
      async (request) =>
        jobDescriptionDTO(
          await service.extractKeywords(descriptionId(request.params.id)),
        ),
    );
    app.post(
      "/job-descriptions/:id/compare-resume/:resumeVersionId",
      {
        schema: {
          tags: ["Job descriptions"],
          summary: "Compare resume with job description",
          params: compareParamsSchema,
          response: {
            200: matchSchema,
            400: errorResponseSchema,
            404: errorResponseSchema,
          },
        },
      },
      async (request) =>
        matchDTO(
          await service.compareResume(
            descriptionId(request.params.id),
            resumeId(request.params.resumeVersionId),
          ),
        ),
    );
    app.get(
      "/applications/:id/recommended-resume",
      {
        schema: {
          tags: ["Job descriptions"],
          summary: "Recommend best matching resume",
          params: idParamsSchema,
          response: {
            200: recommendedSchema,
            400: errorResponseSchema,
            404: errorResponseSchema,
          },
        },
      },
      async (request) => {
        const result = await service.recommendedResume(
          applicationId(request.params.id),
        );
        return {
          resume_version: resumeVersionDTO(result.resumeVersion),
          matched: result.matched,
          missing: result.missing,
          score: result.score,
        };
      },
    );
    app.get(
      "/applications/:id/prep-context",
      {
        schema: {
          tags: ["Interview prep"],
          summary: "Get interview preparation context",
          params: idParamsSchema,
          response: {
            200: prepContextSchema,
            400: errorResponseSchema,
            404: errorResponseSchema,
          },
        },
      },
      async (request) =>
        prepContextDTO(
          await service.prepContext(applicationId(request.params.id)),
        ),
    );
    app.post(
      "/applications/:id/generate-prep-brief",
      {
        schema: {
          tags: ["Interview prep"],
          summary: "Generate interview preparation brief",
          params: idParamsSchema,
          response: {
            201: prepBriefSchema,
            400: errorResponseSchema,
            404: errorResponseSchema,
          },
        },
      },
      async (request, reply) => {
        const brief = await service.generatePrepBrief(
          applicationId(request.params.id),
        );
        return reply.status(201).send({
          role_summary: brief.roleSummary,
          key_gaps: brief.keyGaps,
          focus_areas: brief.focusAreas,
          talking_points: brief.talkingPoints,
          generated_at: brief.generatedAt.toISOString(),
        });
      },
    );
    done();
  };
}

function applicationId(id: string) {
  return requireUUID(id, "invalid application id");
}
function descriptionId(id: string) {
  return requireUUID(id, "invalid job description id");
}
function resumeId(id: string) {
  return requireUUID(id, "invalid resume version id");
}
function jobDescriptionDTO(value: JobDescription) {
  return {
    id: value.id,
    application_id: value.applicationId,
    raw_text: value.rawText,
    extracted_keywords: value.extractedKeywords,
    ...(value.aiSummary === null ? {} : { ai_summary: value.aiSummary }),
    created_at: value.createdAt.toISOString(),
    updated_at: value.updatedAt.toISOString(),
  };
}
function matchDTO(value: ResumeMatchResult) {
  return {
    matched: value.matched,
    missing: value.missing,
    score: value.score,
    compared_keywords: value.comparedKeywords,
    evidence: value.evidence,
  };
}
function prepContextDTO(value: PrepContext) {
  return {
    application: applicationDTO(value.application),
    company: companyDTO(value.company),
    ...(value.jobDescription === null
      ? {}
      : { job_description: jobDescriptionDTO(value.jobDescription) }),
    ...(value.resume === null
      ? {}
      : { resume: resumeVersionDTO(value.resume) }),
    interviews: value.interviews.map(interviewDTO),
    contacts: value.contacts.map(contactDTO),
    audit_logs: value.auditLogs.map(auditLogDTO),
  };
}
