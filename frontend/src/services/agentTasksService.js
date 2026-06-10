import api from "./api";

export const createAgentTask = (projectId, prdText) =>
  api.post("/agent-tasks", { projectId, prdText });

export const chatAgentTask = (id, message) =>
  api.post(`/agent-tasks/${id}/chat`, { message });

export const undoAgentTask = (id) =>
  api.post(`/agent-tasks/${id}/undo`);
