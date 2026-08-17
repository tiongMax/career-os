import { z } from "zod";

import type {
  Application,
  AuditLog,
} from "../applications/application.service.js";
import type { Company } from "../companies/company.service.js";
import type { Contact } from "../contacts/contact.service.js";
import { DomainValidationError } from "../../shared/domain-errors.js";
import type { InterviewRound } from "../interviews/interview.service.js";
import type { ResumeVersion } from "../resumes/resume-version.service.js";

const nullableString = z.string().nullable().optional();

export const createJobDescriptionInputSchema = z.strictObject({
  raw_text: z.string().default(""),
  extracted_keywords: z.array(z.string()).nullable().optional(),
  ai_summary: nullableString,
});

export const updateJobDescriptionInputSchema = z.strictObject({
  raw_text: nullableString,
  extracted_keywords: z.array(z.string()).nullable().optional(),
  ai_summary: nullableString,
});

export type CreateJobDescriptionInput = z.infer<
  typeof createJobDescriptionInputSchema
>;
export type UpdateJobDescriptionInput = z.infer<
  typeof updateJobDescriptionInputSchema
>;

export interface JobDescription {
  id: string;
  applicationId: string;
  rawText: string;
  extractedKeywords: string[];
  aiSummary: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SkillEvidence {
  keyword: string;
  source: "content_text" | "tags" | "name" | "track";
  weight: number;
}

export interface ResumeMatchResult {
  matched: string[];
  missing: string[];
  score: number;
  comparedKeywords: number;
  evidence: SkillEvidence[];
}

export interface RecommendedResumeResult {
  resumeVersion: ResumeVersion;
  matched: string[];
  missing: string[];
  score: number;
}

export interface PrepContext {
  application: Application;
  company: Company;
  jobDescription: JobDescription | null;
  resume: ResumeVersion | null;
  interviews: InterviewRound[];
  contacts: Contact[];
  auditLogs: AuditLog[];
}

export interface PrepBrief {
  roleSummary: string;
  keyGaps: string[];
  focusAreas: string[];
  talkingPoints: string[];
  generatedAt: Date;
}

export interface JobDescriptionsRepository {
  create: (
    applicationId: string,
    input: CreateJobDescriptionInput,
  ) => Promise<JobDescription>;
  getByApplication: (applicationId: string) => Promise<JobDescription>;
  get: (id: string) => Promise<JobDescription>;
  update: (
    id: string,
    input: UpdateJobDescriptionInput,
  ) => Promise<JobDescription>;
  listResumes: () => Promise<ResumeVersion[]>;
  getResume: (id: string) => Promise<ResumeVersion>;
  getPrepContext: (applicationId: string) => Promise<PrepContext>;
}

export interface JobDescriptionsService {
  create: (
    applicationId: string,
    input: CreateJobDescriptionInput,
  ) => Promise<JobDescription>;
  getByApplication: (applicationId: string) => Promise<JobDescription>;
  update: (
    id: string,
    input: UpdateJobDescriptionInput,
  ) => Promise<JobDescription>;
  extractKeywords: (id: string) => Promise<JobDescription>;
  compareResume: (
    id: string,
    resumeVersionId: string,
  ) => Promise<ResumeMatchResult>;
  recommendedResume: (
    applicationId: string,
  ) => Promise<RecommendedResumeResult>;
  prepContext: (applicationId: string) => Promise<PrepContext>;
  generatePrepBrief: (applicationId: string) => Promise<PrepBrief>;
}

const skills = [
  "Go",
  "Python",
  "TypeScript",
  "JavaScript",
  "Java",
  "C++",
  "C#",
  "Rust",
  "Scala",
  "Ruby",
  "PHP",
  "Swift",
  "Kotlin",
  "R",
  "React",
  "Next.js",
  "Vue",
  "Angular",
  "Svelte",
  "Tailwind",
  "Node.js",
  "Express",
  "FastAPI",
  "Django",
  "Flask",
  "Spring",
  "Rails",
  "Gin",
  "Echo",
  "PostgreSQL",
  "MySQL",
  "SQLite",
  "MongoDB",
  "Redis",
  "Elasticsearch",
  "Cassandra",
  "DynamoDB",
  "BigQuery",
  "AWS",
  "GCP",
  "Azure",
  "Kubernetes",
  "Docker",
  "Terraform",
  "Helm",
  "Ansible",
  "CI/CD",
  "GitHub Actions",
  "Machine Learning",
  "Deep Learning",
  "NLP",
  "LLM",
  "PyTorch",
  "TensorFlow",
  "scikit-learn",
  "Pandas",
  "NumPy",
  "Spark",
  "Kafka",
  "RabbitMQ",
  "Pub/Sub",
  "SQS",
  "gRPC",
  "GraphQL",
  "REST",
  "Microservices",
  "DevOps",
  "Agile",
  "Scrum",
  "System Design",
  "API Design",
] as const;

export function createJobDescriptionsService(
  repository: JobDescriptionsRepository,
  now: () => Date = () => new Date(),
): JobDescriptionsService {
  return {
    async create(applicationId, input) {
      requireRawText(input.raw_text);
      return await repository.create(applicationId, {
        ...input,
        extracted_keywords: input.extracted_keywords ?? [],
      });
    },
    getByApplication: (applicationId) =>
      repository.getByApplication(applicationId),
    async update(id, input) {
      if (input.raw_text != null) requireRawText(input.raw_text);
      return await repository.update(id, {
        ...input,
        ...(input.extracted_keywords === null
          ? { extracted_keywords: [] }
          : {}),
      });
    },
    async extractKeywords(id) {
      const description = await repository.get(id);
      const text = description.rawText.toLowerCase();
      const extractedKeywords = skills.filter((skill) =>
        text.includes(skill.toLowerCase()),
      );
      return repository.update(id, {
        extracted_keywords: extractedKeywords,
      });
    },
    async compareResume(id, resumeVersionId) {
      const description = await repository.get(id);
      requireKeywords(description);
      return matchKeywords(
        description.extractedKeywords,
        await repository.getResume(resumeVersionId),
      );
    },
    async recommendedResume(applicationId) {
      const description = await repository.getByApplication(applicationId);
      requireKeywords(description);
      const resumes = await repository.listResumes();
      if (resumes.length === 0)
        throw new DomainValidationError("no resume versions found");
      const ranked = resumes.map((resumeVersion) => ({
        resumeVersion,
        ...matchKeywords(description.extractedKeywords, resumeVersion),
      }));
      const best = ranked.reduce((current, candidate) =>
        candidate.score > current.score ? candidate : current,
      );
      return {
        resumeVersion: best.resumeVersion,
        matched: best.matched,
        missing: best.missing,
        score: best.score,
      };
    },
    prepContext: (applicationId) => repository.getPrepContext(applicationId),
    async generatePrepBrief(applicationId) {
      return buildPrepBrief(
        await repository.getPrepContext(applicationId),
        now(),
      );
    },
  };
}

export function matchKeywords(
  keywords: readonly string[],
  resume: ResumeVersion,
): ResumeMatchResult {
  const matched: string[] = [];
  const missing: string[] = [];
  const evidence: SkillEvidence[] = [];
  let scoreTotal = 0;
  for (const keyword of keywords) {
    const match = bestKeywordEvidence(keyword, resume);
    if (match === undefined) {
      missing.push(keyword);
      continue;
    }
    matched.push(keyword);
    evidence.push({ keyword, ...match });
    scoreTotal += match.weight;
  }
  return {
    matched,
    missing,
    score: keywords.length === 0 ? 0 : scoreTotal / keywords.length,
    comparedKeywords: keywords.length,
    evidence,
  };
}

function bestKeywordEvidence(
  keyword: string,
  resume: ResumeVersion,
): Omit<SkillEvidence, "keyword"> | undefined {
  if (resume.contentText != null && contains(resume.contentText, keyword))
    return { source: "content_text", weight: 1 };
  if (resume.tags.some((tag) => contains(tag, keyword)))
    return { source: "tags", weight: 0.85 };
  if (contains(resume.name, keyword)) return { source: "name", weight: 0.6 };
  if (contains(resume.track, keyword)) return { source: "track", weight: 0.4 };
  return undefined;
}

function buildPrepBrief(context: PrepContext, generatedAt: Date): PrepBrief {
  const employment =
    context.application.employmentType === null
      ? ""
      : ` (${context.application.employmentType})`;
  const location =
    context.application.location === null
      ? ""
      : ` · ${context.application.location}`;
  const match =
    context.jobDescription !== null &&
    context.resume !== null &&
    context.jobDescription.extractedKeywords.length > 0
      ? matchKeywords(context.jobDescription.extractedKeywords, context.resume)
      : undefined;
  const focusAreas = [
    ...new Set(
      context.interviews.map((interview) =>
        interviewFocusArea(interview.roundType),
      ),
    ),
  ];
  const talkingPoints = [
    ...(context.resume?.tags.map((tag) => `Highlight experience with ${tag}`) ??
      []),
    ...(match?.matched.map((keyword) => `Demonstrate ${keyword} proficiency`) ??
      []),
  ];
  return {
    roleSummary: `${context.application.title} at ${context.company.name}${employment}${location}`,
    keyGaps: match?.missing ?? [],
    focusAreas:
      focusAreas.length > 0
        ? focusAreas
        : ["Technical skills", "Behavioral questions", "Company culture fit"],
    talkingPoints:
      talkingPoints.length > 0
        ? talkingPoints
        : [
            "Research the company and role",
            "Prepare STAR-method stories",
            "Review your resume highlights",
          ],
    generatedAt,
  };
}

function interviewFocusArea(roundType: string): string {
  const known: Record<string, string> = {
    technical: "Technical coding and problem solving",
    behavioral: "Behavioral questions (STAR method)",
    system_design: "System design and architecture",
    hr: "HR screening and culture fit",
    take_home: "Take-home assignment review",
  };
  const match = known[roundType];
  if (match !== undefined) return match;
  const words = roundType.replaceAll("_", " ");
  return words.length === 0
    ? words
    : words.charAt(0).toUpperCase() + words.slice(1);
}

function contains(text: string, keyword: string): boolean {
  return text.toLowerCase().includes(keyword.toLowerCase());
}

function requireRawText(rawText: string): void {
  if (rawText.trim() === "")
    throw new DomainValidationError("job description raw_text is required");
}

function requireKeywords(description: JobDescription): void {
  if (description.extractedKeywords.length === 0)
    throw new DomainValidationError(
      "job description has no extracted keywords; run extract-keywords first",
    );
}
