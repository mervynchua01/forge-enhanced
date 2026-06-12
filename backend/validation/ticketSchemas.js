import { z } from "zod";

const ticketSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  acceptance_criteria: z.array(z.string().min(1)).min(1),
  type: z.enum(["Bug", "Feature", "Improvement"]),
  priority: z.string().min(1),
  suggested_assignee: z.string().uuid().optional(),
  clarification_flags: z.array(z.string().min(1)).optional(),
  source: z.literal("ai-generated"),
  generation_task_id: z.string().uuid(),
});

const ticketsSchema = z.array(ticketSchema).min(1);

export { ticketSchema, ticketsSchema };
