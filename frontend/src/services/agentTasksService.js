import api from "./api";

export const createAgentTask = (projectId, payload) =>
  api.post("/agent-tasks", { projectId, ...payload });

export const chatAgentTask = (id, message) =>
  api.post(`/agent-tasks/${id}/chat`, { message });

export const undoAgentTask = (id) =>
  api.post(`/agent-tasks/${id}/undo`);

export const applyDraftTickets = (id, draftTickets) =>
  api.post(`/agent-tasks/${id}/draft`, { draftTickets });

export const confirmAgentTask = (id) =>
  api.post(`/agent-tasks/${id}/confirm`);
