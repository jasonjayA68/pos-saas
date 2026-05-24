import { z } from "zod";

export const CreateCategorySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(50, "Too long"),
});
export type CreateCategoryInput = z.input<typeof CreateCategorySchema>;
