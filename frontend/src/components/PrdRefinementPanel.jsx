import { useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Alert from "@mui/material/Alert";
import Divider from "@mui/material/Divider";
import SendIcon from "@mui/icons-material/Send";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";

import { TypeChip, PriorityChip } from "./ui/MetaChips";

import {
  chatAgentTask,
  applyDraftTickets,
  confirmAgentTask,
} from "../services/agentTasksService";

// Draft ticket preview + conversational refinement, then confirm to the board.
// Used by the PRD import hero once a draft has been generated.
export default function PrdRefinementPanel({
  agentTaskId,
  draftTickets,
  setDraftTickets,
  onConfirmed,
}) {
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatting, setIsChatting] = useState(false);
  const [isConfirmingDraft, setIsConfirmingDraft] = useState(false);
  const [error, setError] = useState("");
  const chatEndRef = useRef(null);

  // Auto-scroll chat to bottom when new messages arrive.
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleSendChat = async () => {
    const text = chatInput.trim();
    if (!text || !agentTaskId || isChatting) return;

    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", content: text }]);
    setIsChatting(true);
    setError("");

    try {
      const response = await chatAgentTask(agentTaskId, text);
      const { draftTickets: updated, message: reply } = response.data;
      setDraftTickets(updated);
      setChatMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      const msg = err?.response?.data?.message || "Refinement failed.";
      setError(msg);
      // Remove the optimistic user message on error.
      setChatMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsChatting(false);
    }
  };

  // Save the draft to the board once the user is happy with it.
  const handleConfirmDraft = async () => {
    if (!agentTaskId || draftTickets.length === 0) {
      setError("Generate a draft before confirming.");
      return;
    }

    setIsConfirmingDraft(true);
    setError("");

    try {
      await applyDraftTickets(agentTaskId, draftTickets);
      await confirmAgentTask(agentTaskId);
      onConfirmed?.();
    } catch (err) {
      const message =
        err?.response?.data?.message || err?.message || "Failed to confirm draft.";
      setError(message);
    } finally {
      setIsConfirmingDraft(false);
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Box sx={{ display: "flex", gap: 2, height: 560 }}>
        {/* Left: draft ticket preview */}
        <Box
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
          }}
        >
          <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 1 }}>
            <AutoAwesomeIcon fontSize="small" sx={{ color: "primary.main" }} />
            <Typography variant="subtitle1" fontWeight={700}>
              Draft preview ({draftTickets.length})
            </Typography>
          </Stack>

          {error ? (
            <Alert severity="error" sx={{ mb: 1 }}>
              {error}
            </Alert>
          ) : null}

          <Box sx={{ overflowY: "auto", flex: 1, pr: 0.5 }}>
            <Stack spacing={1.5}>
              {draftTickets.map((ticket, index) => (
                <Box
                  key={ticket.draft_id || `${ticket.title}-${index}`}
                  sx={{
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 2,
                    p: 1.5,
                    bgcolor: "background.paper",
                  }}
                >
                  <Typography variant="subtitle2" fontWeight={700}>
                    {ticket.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {ticket.description}
                  </Typography>
                  <Stack direction="row" spacing={0.75} sx={{ mt: 0.75 }}>
                    {ticket.type ? <TypeChip value={ticket.type} /> : null}
                    {ticket.priority ? (
                      <PriorityChip value={ticket.priority} />
                    ) : null}
                  </Stack>
                </Box>
              ))}
            </Stack>
          </Box>
        </Box>

        <Divider orientation="vertical" flexItem />

        {/* Right: chat panel */}
        <Box
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
          }}
        >
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
            Refine with chat
          </Typography>

          {/* Message history */}
          <Box
            sx={{
              flex: 1,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 1,
              pr: 0.5,
              mb: 1,
            }}
          >
            {chatMessages.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Ask Claude to edit, split, merge, or reorder the draft tickets.
              </Typography>
            ) : null}
            {chatMessages.map((msg, i) => (
              <Box
                key={i}
                sx={{
                  alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "85%",
                  bgcolor: msg.role === "user" ? "primary.main" : "action.hover",
                  color: msg.role === "user" ? "primary.contrastText" : "text.primary",
                  borderRadius: 2,
                  px: 1.5,
                  py: 1,
                }}
              >
                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                  {msg.content}
                </Typography>
              </Box>
            ))}
            {isChatting ? (
              <Box
                sx={{
                  alignSelf: "flex-start",
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  "@keyframes forgePulse": {
                    "0%, 100%": { opacity: 0.4 },
                    "50%": { opacity: 1 },
                  },
                }}
              >
                <AutoAwesomeIcon
                  sx={{
                    fontSize: 16,
                    color: "primary.main",
                    animation: "forgePulse 1.4s ease-in-out infinite",
                  }}
                />
                <Typography variant="caption" color="text.secondary">
                  Thinking...
                </Typography>
              </Box>
            ) : null}
            <div ref={chatEndRef} />
          </Box>

          {/* Chat input */}
          <Box sx={{ display: "flex", gap: 1, alignItems: "flex-end" }}>
            <TextField
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendChat();
                }
              }}
              placeholder="e.g. Make all auth tickets High priority"
              multiline
              maxRows={4}
              fullWidth
              size="small"
              disabled={isChatting}
            />
            <IconButton
              onClick={handleSendChat}
              disabled={!chatInput.trim() || isChatting}
              color="primary"
            >
              <SendIcon />
            </IconButton>
          </Box>
        </Box>
      </Box>

      <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
        <Button
          onClick={handleConfirmDraft}
          variant="contained"
          disabled={isConfirmingDraft || isChatting}
        >
          {isConfirmingDraft ? "Confirming..." : "Confirm to Board"}
        </Button>
      </Box>
    </Box>
  );
}
