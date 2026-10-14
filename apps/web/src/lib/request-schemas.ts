import { z } from "zod";
import { readJson } from "./http";

const creationFields = {
  title: z.string().trim().max(120).optional(),
  brief: z.string().trim().max(10000).optional(),
  format_id: z.string().trim().min(1).max(120).optional(),
  reference_url: z.string().trim().max(2000).optional(),
};
export const creationSchema = z.object(creationFields).refine((body) => !body.brief || body.brief.length >= 12, { message: "Describe the carousel in at least 12 characters.", path: ["brief"] });
export const generationSchema = z.object({ ...creationFields,
  brief: z.string().trim().min(12).max(10000), slide_count: z.number().int().min(1).max(12).optional(),
});
export const slideRevisionSchema = z.object({ instruction: z.string().trim().min(1).max(2000) });

export async function readRequestBody<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  const result = schema.safeParse(await readJson(request));
  if (!result.success) throw Object.assign(new Error(result.error.issues[0]?.message ?? "Provide a valid request."), {
    status: 400, code: "INVALID_REQUEST", details: { fields: result.error.issues.map((issue) => issue.path.join(".")) },
  });
  return result.data;
}
