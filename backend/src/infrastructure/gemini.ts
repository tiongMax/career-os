import type {
  AnalysisProvider,
  AnalysisResult,
} from "../domain/analysis/analysis.js";
import { z } from "zod";

const analysisResultSchema = z.object({
  summary: z.string().default(""),
  recommended_resume_id: z.string().optional(),
  recommended_resume_name: z.string().optional(),
  match_score: z.number().default(0),
  matched_skills: z.array(z.string()).default([]),
  missing_skills: z.array(z.string()).default([]),
  extracted_keywords: z.array(z.string()).optional(),
  core_requirements: z.array(z.string()).optional(),
  responsibilities: z.array(z.string()).optional(),
  seniority: z.string().optional(),
  resume_feedback: z.array(z.string()).default([]),
  interview_focus: z.array(z.string()).default([]),
  prep_plan: z.array(z.string()).optional(),
  talking_points: z.array(z.string()).optional(),
  suggested_questions: z.array(z.string()).optional(),
});
export function createGeminiProvider(options: {
  apiKey: string;
  model: string;
  embeddingModel: string;
  baseUrl: string;
  timeoutMs: number;
}): AnalysisProvider {
  async function request(path: string, body: unknown): Promise<Response> {
    const response = await fetch(
      `${options.baseUrl}/models/${path}?key=${encodeURIComponent(options.apiKey)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(options.timeoutMs),
      },
    );
    if (!response.ok)
      throw new Error(`Gemini request failed: ${String(response.status)}`);
    return response;
  }
  return {
    async analyze(input) {
      const response = await request(`${options.model}:generateContent`, {
        contents: [
          {
            role: "user",
            parts: [
              {
                text: buildPrompt(input),
              },
            ],
          },
        ],
        generationConfig: { responseMimeType: "application/json" },
      });
      const body = (await response.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const text = body.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("Gemini response contained no analysis");
      return analysisResultSchema.parse(JSON.parse(text)) satisfies Omit<
        AnalysisResult,
        "generated_at"
      >;
    },
    async embed(text, taskType) {
      const response = await request(`${options.embeddingModel}:embedContent`, {
        model: `models/${options.embeddingModel}`,
        content: { parts: [{ text }] },
        taskType,
      });
      const body = (await response.json()) as {
        embedding?: { values?: number[] };
      };
      const values = body.embedding?.values;
      if (!values?.length)
        throw new Error("Gemini response contained no embedding");
      return values;
    },
  };
}

function buildPrompt(input: unknown): string {
  return [
    "Analyze this CareerOS application context for the requested job type.",
    "Return one JSON object only. Use only evidence present in the input.",
    "Include summary, match_score, matched_skills, missing_skills, resume_feedback, and interview_focus, plus relevant optional fields.",
    JSON.stringify(input),
  ].join("\n\n");
}
