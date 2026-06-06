const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/verifyToken");
const requireRole = require("../middleware/requireRole");
const {
  createProject,
  getProjects,
  getProjectById,
  editProject,
  deleteProject,
  queryUser,
  queryProject,
  getProjectProgress,
  getProjectMembers,
} = require("../controllers/projectsController");

router.get("/query", verifyToken, queryUser);
router.get("/", verifyToken, getProjects);
router.post("/new", verifyToken, createProject);
router.get("/:projectId", verifyToken, getProjectById);
router.get("/:projectId/progress", verifyToken, getProjectProgress);
router.get("/:projectId/members", verifyToken, getProjectMembers);
router.patch("/:projectId/edit", verifyToken, requireRole("admin"), editProject);
// router.delete("/:projectId", verifyToken, requireRole("admin"), deleteProject);

module.exports = router;
