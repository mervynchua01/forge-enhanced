import api from "./api";
import { getApiBaseUrl } from "../lib/apiBaseUrl";

//Get projects
const getProjects = () => {
  return api.get("/projects");
};

//Create new project
const createProject = (projectData) => {
  return api.post("/projects/new", projectData);
};

const queryUserByName = (username) => {
  return api.get(`/projects/query?search=${username}`);
};

//Get Project by Id
const getProjectDetails = (projectId) => {
  return api.get(`/projects/${projectId}`);
};

//Edit project
const editProject = (projectId, projectData) => {
  return api.patch(`/projects/${projectId}/edit`, projectData);
};

//Get project's tasks
const getProjectProgress = (projectId) => {
  return api.get(`/projects/${projectId}/progress`);
};

export {
  getProjects,
  createProject,
  queryUserByName,
  getProjectDetails,
  editProject,
  getProjectProgress,
};
