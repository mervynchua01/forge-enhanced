import Anthropic from "@anthropic-ai/sdk";
import { REFINEMENT_TOOLS, executeTool } from "./refinementTools.js";

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
 * Pass prdText for plain text, or prdFileBase64 + mimeType for an uploaded PDF.
 * Throws if the API call fails or the response is not valid JSON.
 */
const generateDraftTickets = async (prdText, { prdFileBase64, mimeType } = {}) => {
  // PDFs get a native document block so Claude reads the actual layout and
  // structure rather than receiving lossy extracted text.
  let userContent;
  if (prdFileBase64 && mimeType === "application/pdf") {
    userContent = [
      {
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: prdFileBase64 },
      },
      { type: "text", text: "Convert this PRD document into structured engineering tickets." },
    ];
  } else {
    userContent = `Here is the PRD. Convert it into structured engineering tickets:\n\n${prdText}`;
  }

  const message = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userContent }],
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

const REFINEMENT_SYSTEM_PROMPT = (draftTickets) =>
  `You are a helpful assistant that refines engineering ticket drafts based on user instructions.

Use the provided tools to make precise edits to the draft. After completing all changes, write a short summary (1–3 sentences) describing what you did.

Current draft tickets:
${JSON.stringify(draftTickets, null, 2)}

Each ticket has a "draft_id" — use it as the identifier in every tool call.`;

/**
 * Run one conversational refinement turn with full agentic tool-use loop.
 * `turns` is the stored chat_history array (each element has { snapshot_before, messages }).
 * Returns { updatedDraft, turnMessages, assistantText }.
 */
const refineTickets = async (turns, draftTickets, userMessage) => {
  // Replay all previous turn messages so Claude has full conversation context.
  const messages = [];
  for (const turn of turns) {
    for (const msg of turn.messages) {
      messages.push(msg);
    }
  }
  messages.push({ role: "user", content: userMessage });

  let currentDraft = [...draftTickets];
  // Track messages added this turn for storage.
  const turnMessages = [{ role: "user", content: userMessage }];

  // Agentic loop: keep going until Claude stops requesting tool calls.
  while (true) {
    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 4096,
      system: REFINEMENT_SYSTEM_PROMPT(currentDraft),
      messages,
      tools: REFINEMENT_TOOLS,
    });

    const assistantMsg = { role: "assistant", content: response.content };
    messages.push(assistantMsg);
    turnMessages.push(assistantMsg);

    if (response.stop_reason !== "tool_use") break;

    // Execute each tool call and collect results.
    const toolResults = [];
    for (const block of response.content) {
      if (block.type !== "tool_use") continue;

      try {
        const { draft: updatedDraft, result } = executeTool(
          block.name,
          block.input,
          currentDraft,
        );
        currentDraft = updatedDraft;
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: JSON.stringify(result),
        });
      } catch (err) {
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: err.message,
          is_error: true,
        });
      }
    }

    const toolResultMsg = { role: "user", content: toolResults };
    messages.push(toolResultMsg);
    turnMessages.push(toolResultMsg);
  }

  // Extract the final text summary Claude wrote.
  const lastAssistant = [...turnMessages].reverse().find((m) => m.role === "assistant");
  const assistantText = (Array.isArray(lastAssistant?.content) ? lastAssistant.content : [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  return { updatedDraft: currentDraft, turnMessages, assistantText };
};

export { generateDraftTickets, refineTickets };
