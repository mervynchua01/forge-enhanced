const Anthropic = require("@anthropic-ai/sdk");

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// The exact JSON shape Claude must return — mirrors the Zod ticketSchema
// (without source/generation_task_id which the controller adds after).
const TICKET_JSON_EXAMPLE = JSON.stringify(
  [
    {
      title: "Short imperative title",
      description: "One-paragraph description of the work",
      acceptance_criteria: ["Criterion 1", "Criterion 2"],
      type: "Feature",
      priority: "High",
      clarification_flags: ["Optional: list any unclear requirements"],
    },
  ],
  null,
  2,
);

const SYSTEM_PROMPT = `You are an expert product manager who converts Product Requirements Documents (PRDs) into structured engineering tickets.

Respond ONLY with a valid JSON array of tickets. No prose, no markdown fences, no explanation — just the raw JSON array.

Each ticket must include:
- title: short imperative phrase (max 80 chars)
- description: 1–3 sentences explaining the work
- acceptance_criteria: array of 2–5 testable strings
- type: one of "Bug", "Feature", or "Improvement"
- priority: one of "High", "Medium", or "Low"
- clarification_flags: (optional) array of strings flagging ambiguous requirements

Generate between 3 and 8 tickets. Focus on discrete, actionable units of work.

Example format:
${TICKET_JSON_EXAMPLE}`;

/**
 * Call Claude Haiku 4.5 with a PRD and return a raw parsed JSON array.
 * Throws if the API call fails or the response is not valid JSON.
 */
const generateDraftTickets = async (prdText) => {
  const message = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Here is the PRD. Convert it into structured engineering tickets:\n\n${prdText}`,
      },
    ],
  });

  // Claude returns a list of content blocks. We want the first text block.
  const textBlock = message.content.find((block) => block.type === "text");
  if (!textBlock) {
    throw new Error("Claude returned no text content.");
  }

  // Strip any accidental markdown code fences Claude may have added.
  const raw = textBlock.text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();

  return JSON.parse(raw);
};

module.exports = { generateDraftTickets };
