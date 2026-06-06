const { supabaseAdmin } = require("../lib/supabase");
const { ticketsSchema } = require("../validation/ticketSchemas");

// Input limits and retention defaults for PRD intake.
const MAX_PRD_CHARS = 50000;
const DEFAULT_RETENTION_DAYS = 90;

// Check whether a user is allowed to access a project.
const isProjectMember = (project, userId) => {
  if (!project) return false;
  if (project.project_lead === userId) return true;
  return (project.members || []).includes(userId);
};

// Normalize the database row into the API shape.
const mapAgentTask = (row) => ({
  id: row.id,
  projectId: row.project_id,
  createdBy: row.created_by,
  prdText: row.prd_text,
  draftTickets: row.draft_tickets,
  chatHistory: row.chat_history,
  state: row.state,
  retentionUntil: row.retention_until,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const normalizeDraftTickets = (draftTickets, agentTaskId) => {
  if (!Array.isArray(draftTickets)) return draftTickets;

  return draftTickets.map((ticket) => ({
    ...ticket,
    source: "ai-generated",
    generation_task_id: agentTaskId,
  }));
};

const validateWithRetry = async (draftTickets, retryFn) => {
  const first = ticketsSchema.safeParse(draftTickets);
  if (first.success) return { tickets: first.data, retried: false };

  if (!retryFn) {
    return { error: first.error, retried: false };
  }

  const retryTickets = await retryFn(first.error);
  const second = ticketsSchema.safeParse(retryTickets);
  if (second.success) return { tickets: second.data, retried: true };

  return { error: second.error, retried: true };
};

const mapDraftTicketToTask = (ticket, projectId, userId) => ({
  title: ticket.title,
  description: ticket.description,
  type: ticket.type,
  status: "To Do",
  priority: ticket.priority,
  due_date: null,
  project_id: projectId,
  assignees: ticket.suggested_assignee ? [ticket.suggested_assignee] : [],
  created_by: userId,
  comment: [],
});

// Create a new draft-generation task from a PRD submission.
exports.createAgentTask = async (req, res) => {
  try {
    const { projectId, prdText } = req.body;

    // Validate required inputs before any database work.
    if (!projectId || typeof projectId !== "string") {
      return res.status(400).json({ message: "projectId is required." });
    }
    if (!prdText || typeof prdText !== "string") {
      return res.status(400).json({ message: "prdText is required." });
    }
    if (prdText.length > MAX_PRD_CHARS) {
      return res.status(400).json({
        message: `PRD exceeds ${MAX_PRD_CHARS} characters.`,
      });
    }

    // Load the project to enforce membership checks.
    const { data: project, error: projectError } = await supabaseAdmin
      .from("projects")
      .select("id, project_lead, members")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ message: "Project not found." });
    }

    // Reject callers that are not part of the project.
    if (!isProjectMember(project, req.user.userId)) {
      return res.status(403).json({ message: "Not authorized for this project." });
    }

    // Set a simple retention timestamp to support future cleanup.
    const retentionUntil = new Date(
      Date.now() + DEFAULT_RETENTION_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();

    // Insert the new agent task in its initial state.
    const { data: agentTask, error } = await supabaseAdmin
      .from("agent_tasks")
      .insert({
        project_id: projectId,
        created_by: req.user.userId,
        prd_text: prdText,
        state: "generating",
        retention_until: retentionUntil,
      })
      .select("*")
      .single();

    if (error || !agentTask) {
      return res.status(500).json({ message: error?.message || "Create failed." });
    }

    // Return the created task in a stable response shape.
    return res.status(201).json({ agentTask: mapAgentTask(agentTask) });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Fetch the current draft state for debugging and traceability.
exports.getAgentTaskTrace = async (req, res) => {
  try {
    const { id } = req.params;

    // Load the agent task row by id.
    const { data: agentTask, error } = await supabaseAdmin
      .from("agent_tasks")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !agentTask) {
      return res.status(404).json({ message: "Agent task not found." });
    }

    // Reload the project for authorization checks.
    const { data: project, error: projectError } = await supabaseAdmin
      .from("projects")
      .select("id, project_lead, members")
      .eq("id", agentTask.project_id)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ message: "Project not found." });
    }

    // Enforce that only project members can access the trace.
    if (!isProjectMember(project, req.user.userId)) {
      return res.status(403).json({ message: "Not authorized for this project." });
    }

    // Return the stored task as a simple trace payload.
    return res.json({ trace: mapAgentTask(agentTask) });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.applyDraftTickets = async (req, res) => {
  try {
    const { id } = req.params;
    const { draftTickets, retryDraftTickets } = req.body;

    const { data: agentTask, error } = await supabaseAdmin
      .from("agent_tasks")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !agentTask) {
      return res.status(404).json({ message: "Agent task not found." });
    }

    const { data: project, error: projectError } = await supabaseAdmin
      .from("projects")
      .select("id, project_lead, members")
      .eq("id", agentTask.project_id)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ message: "Project not found." });
    }

    if (!isProjectMember(project, req.user.userId)) {
      return res.status(403).json({ message: "Not authorized for this project." });
    }

    const normalizedDrafts = normalizeDraftTickets(draftTickets, agentTask.id);

    const { tickets, error: validationError, retried } = await validateWithRetry(
      normalizedDrafts,
      retryDraftTickets
        ? async () => normalizeDraftTickets(retryDraftTickets, agentTask.id)
        : null,
    );

    if (validationError) {
      return res.status(400).json({
        message: "Draft tickets failed validation.",
        retried,
        errors: validationError.flatten(),
      });
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("agent_tasks")
      .update({
        draft_tickets: tickets,
        state: "draft_ready",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();

    if (updateError || !updated) {
      return res.status(500).json({ message: updateError?.message || "Update failed." });
    }

    return res.json({ agentTask: mapAgentTask(updated), retried });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Copy the approved draft tickets into the live task board.
exports.confirmAgentTask = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: agentTask, error } = await supabaseAdmin
      .from("agent_tasks")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !agentTask) {
      return res.status(404).json({ message: "Agent task not found." });
    }

    const { data: project, error: projectError } = await supabaseAdmin
      .from("projects")
      .select("id, project_lead, members")
      .eq("id", agentTask.project_id)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ message: "Project not found." });
    }

    if (!isProjectMember(project, req.user.userId)) {
      return res.status(403).json({ message: "Not authorized for this project." });
    }

    const draftTickets = Array.isArray(agentTask.draft_tickets)
      ? agentTask.draft_tickets
      : [];

    if (draftTickets.length === 0) {
      return res.status(400).json({ message: "No draft tickets to confirm." });
    }

    const taskRows = draftTickets.map((ticket) =>
      mapDraftTicketToTask(ticket, agentTask.project_id, req.user.userId),
    );

    const { data: createdTasks, error: taskError } = await supabaseAdmin
      .from("tasks")
      .insert(taskRows)
      .select("*");

    if (taskError) {
      return res.status(500).json({ message: taskError.message });
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("agent_tasks")
      .update({
        state: "confirmed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();

    if (updateError || !updated) {
      return res.status(500).json({ message: updateError?.message || "Confirmation failed." });
    }

    return res.status(201).json({
      agentTask: mapAgentTask(updated),
      createdTasks,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
