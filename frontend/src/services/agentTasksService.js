import api from "./api";

// Create a new PRD generation task for the current project.
export const createAgentTask = (projectId, prdText) => {
  return api.post("/agent-tasks", { projectId, prdText });
};
