import express from "express";
import verifyToken from "../middleware/verifyToken.js";
import {
  createTask,
  getTasksByProject,
  deleteTask,
  updateTask,
} from "../controllers/issueController.js";

const router = express.Router();

router.post("/tasks", verifyToken, createTask);
router.get("/tasks/:projectId", verifyToken, getTasksByProject);
router.delete("/tasks/:id", verifyToken, deleteTask);
router.patch("/tasks/:id", verifyToken, updateTask);

export default router;
