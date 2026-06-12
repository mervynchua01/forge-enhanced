import express from "express";
import verifyToken from "../middleware/verifyToken.js";
import {
  createAgentTask,
  getAgentTaskTrace,
  applyDraftTickets,
  confirmAgentTask,
  chatAgentTask,
} from "../controllers/agentTasksController.js";

const router = express.Router();

router.post("/", verifyToken, createAgentTask);
router.get("/:id/trace", verifyToken, getAgentTaskTrace);
router.post("/:id/draft", verifyToken, applyDraftTickets);
router.post("/:id/confirm", verifyToken, confirmAgentTask);
router.post("/:id/chat", verifyToken, chatAgentTask);

export default router;
