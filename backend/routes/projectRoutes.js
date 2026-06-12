import express from "express";
import verifyToken from "../middleware/verifyToken.js";
import requireRole from "../middleware/requireRole.js";
import {
  createProject,
  getProjects,
  getProjectById,
  editProject,
  deleteProject,
  queryUser,
  queryProject,
  getProjectProgress,
  getProjectMembers,
} from "../controllers/projectsController.js";

const router = express.Router();

router.get("/query", verifyToken, queryUser);
router.get("/", verifyToken, getProjects);
router.post("/new", verifyToken, createProject);
router.get("/:projectId", verifyToken, getProjectById);
router.get("/:projectId/progress", verifyToken, getProjectProgress);
router.get("/:projectId/members", verifyToken, getProjectMembers);
router.patch("/:projectId/edit", verifyToken, requireRole("admin"), editProject);
// router.delete("/:projectId", verifyToken, requireRole("admin"), deleteProject);

export default router;
