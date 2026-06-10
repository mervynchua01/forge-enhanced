const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/verifyToken");
const {
  createAgentTask,
  getAgentTaskTrace,
  applyDraftTickets,
  confirmAgentTask,
  chatAgentTask,
  undoAgentTask,
} = require("../controllers/agentTasksController");

router.post("/", verifyToken, createAgentTask);
router.get("/:id/trace", verifyToken, getAgentTaskTrace);
router.post("/:id/draft", verifyToken, applyDraftTickets);
router.post("/:id/confirm", verifyToken, confirmAgentTask);
router.post("/:id/chat", verifyToken, chatAgentTask);
router.post("/:id/undo", verifyToken, undoAgentTask);

module.exports = router;
