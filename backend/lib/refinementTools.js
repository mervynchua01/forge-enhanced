import { randomUUID } from "crypto";

const REFINEMENT_TOOLS = [
  {
    name: "update_ticket",
    description: "Update one or more fields on an existing draft ticket.",
    input_schema: {
      type: "object",
      properties: {
        id: { type: "string", description: "draft_id of the ticket to update." },
        fields: {
          type: "object",
          description: "Fields to update on the ticket.",
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            acceptance_criteria: { type: "array", items: { type: "string" } },
            type: { type: "string", enum: ["Bug", "Feature", "Improvement"] },
            priority: { type: "string", enum: ["High", "Medium", "Low"] },
            clarification_flags: { type: "array", items: { type: "string" } },
          },
          additionalProperties: false,
        },
      },
      required: ["id", "fields"],
    },
  },
  {
    name: "add_ticket",
    description: "Add a new ticket to the draft.",
    input_schema: {
      type: "object",
      properties: {
        fields: {
          type: "object",
          description: "Content for the new ticket.",
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            acceptance_criteria: { type: "array", items: { type: "string" } },
            type: { type: "string", enum: ["Bug", "Feature", "Improvement"] },
            priority: { type: "string", enum: ["High", "Medium", "Low"] },
            clarification_flags: { type: "array", items: { type: "string" } },
          },
          required: ["title", "description", "acceptance_criteria", "type", "priority"],
          additionalProperties: false,
        },
      },
      required: ["fields"],
    },
  },
  {
    name: "delete_ticket",
    description: "Remove a ticket from the draft.",
    input_schema: {
      type: "object",
      properties: {
        id: { type: "string", description: "draft_id of the ticket to delete." },
      },
      required: ["id"],
    },
  },
  {
    name: "merge_tickets",
    description: "Merge two or more tickets into a single combined ticket.",
    input_schema: {
      type: "object",
      properties: {
        ids: {
          type: "array",
          items: { type: "string" },
          minItems: 2,
          description: "draft_ids of the tickets to merge.",
        },
        merged_ticket: {
          type: "object",
          description: "Content for the resulting merged ticket.",
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            acceptance_criteria: { type: "array", items: { type: "string" } },
            type: { type: "string", enum: ["Bug", "Feature", "Improvement"] },
            priority: { type: "string", enum: ["High", "Medium", "Low"] },
          },
          required: ["title", "description", "acceptance_criteria", "type", "priority"],
          additionalProperties: false,
        },
      },
      required: ["ids", "merged_ticket"],
    },
  },
  {
    name: "split_ticket",
    description: "Split one ticket into multiple smaller tickets.",
    input_schema: {
      type: "object",
      properties: {
        id: { type: "string", description: "draft_id of the ticket to split." },
        tickets: {
          type: "array",
          minItems: 2,
          description: "The resulting split tickets.",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              acceptance_criteria: { type: "array", items: { type: "string" } },
              type: { type: "string", enum: ["Bug", "Feature", "Improvement"] },
              priority: { type: "string", enum: ["High", "Medium", "Low"] },
            },
            required: ["title", "description", "acceptance_criteria", "type", "priority"],
            additionalProperties: false,
          },
        },
      },
      required: ["id", "tickets"],
    },
  },
  {
    name: "reorder_tickets",
    description: "Reorder draft tickets by specifying the desired sequence of IDs.",
    input_schema: {
      type: "object",
      properties: {
        order: {
          type: "array",
          items: { type: "string" },
          description: "Array of all draft_ids in the desired display order.",
        },
      },
      required: ["order"],
    },
  },
  {
    name: "bulk_update",
    description: "Apply the same field changes to multiple tickets at once.",
    input_schema: {
      type: "object",
      properties: {
        ids: {
          type: "array",
          items: { type: "string" },
          description: "draft_ids of the tickets to update.",
        },
        fields: {
          type: "object",
          description: "Fields to apply to all selected tickets.",
          properties: {
            type: { type: "string", enum: ["Bug", "Feature", "Improvement"] },
            priority: { type: "string", enum: ["High", "Medium", "Low"] },
            clarification_flags: { type: "array", items: { type: "string" } },
          },
          additionalProperties: false,
        },
      },
      required: ["ids", "fields"],
    },
  },
];

// Ensure every ticket has a stable draft_id for tool operations.
const ensureIds = (tickets) =>
  tickets.map((t) => ({ ...t, draft_id: t.draft_id || randomUUID() }));

// Execute a single tool call against the current draft and return the updated draft.
// Throws on invalid input so the caller can forward an is_error tool_result to Claude.
const executeTool = (name, input, draft) => {
  switch (name) {
    case "update_ticket": {
      if (!draft.find((t) => t.draft_id === input.id)) {
        throw new Error(`Ticket ${input.id} not found.`);
      }
      return {
        draft: draft.map((t) =>
          t.draft_id === input.id ? { ...t, ...input.fields } : t,
        ),
        result: { updated: input.id },
      };
    }

    case "add_ticket": {
      const ref = draft[0];
      const newTicket = {
        ...input.fields,
        source: "ai-generated",
        generation_task_id: ref?.generation_task_id,
        draft_id: randomUUID(),
      };
      return { draft: [...draft, newTicket], result: { added: newTicket.draft_id } };
    }

    case "delete_ticket": {
      if (!draft.find((t) => t.draft_id === input.id)) {
        throw new Error(`Ticket ${input.id} not found.`);
      }
      return {
        draft: draft.filter((t) => t.draft_id !== input.id),
        result: { deleted: input.id },
      };
    }

    case "merge_tickets": {
      const { ids, merged_ticket } = input;
      const matchingIds = ids.filter((id) => draft.find((t) => t.draft_id === id));
      if (matchingIds.length < 2) {
        throw new Error("At least 2 valid ticket IDs are required to merge.");
      }
      const firstIdx = draft.findIndex((t) => ids.includes(t.draft_id));
      const ref = draft[firstIdx];
      const newTicket = {
        ...merged_ticket,
        source: "ai-generated",
        generation_task_id: ref?.generation_task_id,
        draft_id: randomUUID(),
      };
      const withoutMerged = draft.filter((t) => !ids.includes(t.draft_id));
      withoutMerged.splice(firstIdx, 0, newTicket);
      return { draft: withoutMerged, result: { merged: ids, into: newTicket.draft_id } };
    }

    case "split_ticket": {
      const idx = draft.findIndex((t) => t.draft_id === input.id);
      if (idx === -1) throw new Error(`Ticket ${input.id} not found.`);
      const ref = draft[idx];
      const newTickets = input.tickets.map((t) => ({
        ...t,
        source: "ai-generated",
        generation_task_id: ref?.generation_task_id,
        draft_id: randomUUID(),
      }));
      const updated = [...draft];
      updated.splice(idx, 1, ...newTickets);
      return {
        draft: updated,
        result: { split: input.id, into: newTickets.map((t) => t.draft_id) },
      };
    }

    case "reorder_tickets": {
      const { order } = input;
      const map = Object.fromEntries(draft.map((t) => [t.draft_id, t]));
      const reordered = order.map((id) => map[id]).filter(Boolean);
      const inOrder = new Set(order);
      draft.forEach((t) => { if (!inOrder.has(t.draft_id)) reordered.push(t); });
      return { draft: reordered, result: { reordered: order } };
    }

    case "bulk_update": {
      const { ids, fields } = input;
      return {
        draft: draft.map((t) => (ids.includes(t.draft_id) ? { ...t, ...fields } : t)),
        result: { updated: ids },
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
};

export { REFINEMENT_TOOLS, ensureIds, executeTool };
