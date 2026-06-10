import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Box from "@mui/material/Box";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Alert from "@mui/material/Alert";
import Divider from "@mui/material/Divider";
import CircularProgress from "@mui/material/CircularProgress";
import UndoIcon from "@mui/icons-material/Undo";
import SendIcon from "@mui/icons-material/Send";
import dayjs from "dayjs";

import KanbanBoard from "../components/KanbanBoard";
import TaskModal from "../components/TaskModal";
import { getProjectDetails } from "../services/projectSpaceService";
import { createAgentTask, chatAgentTask, undoAgentTask } from "../services/agentTasksService";
import { getApiBaseUrl } from "../lib/apiBaseUrl";
import { supabase } from "../lib/supabaseClient";

const getTokenWithTimeout = async () => {
  try {
    const timeout = new Promise((resolve) => setTimeout(resolve, 2000));
    const { data } = await Promise.race([
      supabase.auth.getSession(),
      timeout.then(() => ({ data: null })),
    ]);
    return data?.session?.access_token || null;
  } catch {
    return null;
  }
};


export default function TaskPage() {
  const { projectId } = useParams();
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [project, setProject] = useState(null);
  const [open, setOpen] = useState(false);
  const [selectedTask, setSelectedTask] =
    useState(null);
  const [taskModalKey, setTaskModalKey] = useState(0);
  const [openPrdImport, setOpenPrdImport] = useState(false);
  const [prdText, setPrdText] = useState("");
  const [prdImportError, setPrdImportError] = useState("");
  const [prdImportSuccess, setPrdImportSuccess] = useState("");
  const [isSubmittingPrd, setIsSubmittingPrd] = useState(false);
  const [agentTaskId, setAgentTaskId] = useState("");
  const [draftTickets, setDraftTickets] = useState([]);
  const [isConfirmingDraft, setIsConfirmingDraft] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatting, setIsChatting] = useState(false);
  const [isUndoing, setIsUndoing] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const response = await getProjectDetails(projectId);
        const p = response?.data?.project;
        if (!cancelled) setProject(p || null);
      } catch (err) {
        console.error(err);
        if (!cancelled) setProject(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const token = await getTokenWithTimeout();
      const res = await fetch(
        `${getApiBaseUrl()}/api/tasks/${projectId}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        },
      );
      const payload = await res.json();
      if (!cancelled) setTasks(payload);
    })().catch(console.error);

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const token = await getTokenWithTimeout();
      const res = await fetch(
        `${getApiBaseUrl()}/api/projects/${projectId}/members`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        },
      );
      const payload = await res.json();
      if (!cancelled) setMembers(payload);
    })().catch(console.error);

    return () => {
      cancelled = true;
    };
  }, [projectId]);


  const handleCreateTask = () => {
    setSelectedTask(null);
    setTaskModalKey((current) => current + 1);

    setOpen(true);
  };

  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setTaskModalKey((current) => current + 1);

    setOpen(true);
  };

  // Auto-scroll chat to bottom when new messages arrive.
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Reset the import state each time the modal opens.
  const handleOpenPrdImport = () => {
    setPrdImportError("");
    setPrdImportSuccess("");
    setAgentTaskId("");
    setDraftTickets([]);
    setChatMessages([]);
    setChatInput("");
    setOpenPrdImport(true);
  };

  const handleClosePrdImport = () => {
    setOpenPrdImport(false);
    setPrdImportError("");
    setPrdImportSuccess("");
    setAgentTaskId("");
    setDraftTickets([]);
    setChatMessages([]);
    setChatInput("");
  };

  // Store the PRD on the server and build the preview draft locally.
  const handleSubmitPrd = async () => {
    if (!prdText.trim()) {
      setPrdImportError("Paste a PRD before importing.");
      return;
    }

    setIsSubmittingPrd(true);
    setPrdImportError("");
    setPrdImportSuccess("");

    try {
      const response = await createAgentTask(projectId, prdText.trim());
      const agentTask = response?.data?.agentTask;
      const drafts = response?.data?.draftTickets ?? [];

      setAgentTaskId(agentTask?.id || "");
      setDraftTickets(drafts);

      setPrdImportSuccess(
        drafts.length > 0
          ? `${drafts.length} tickets generated. Review them below, then confirm to add to the board.`
          : "Draft ready for review.",
      );
    } catch (err) {
      const message = err?.response?.data?.message || "PRD import failed.";
      setPrdImportError(message);
    } finally {
      setIsSubmittingPrd(false);
    }
  };

  const handleSendChat = async () => {
    const text = chatInput.trim();
    if (!text || !agentTaskId || isChatting) return;

    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", content: text }]);
    setIsChatting(true);
    setPrdImportError("");

    try {
      const response = await chatAgentTask(agentTaskId, text);
      const { draftTickets: updated, message: reply } = response.data;
      setDraftTickets(updated);
      setChatMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      const msg = err?.response?.data?.message || "Refinement failed.";
      setPrdImportError(msg);
      // Remove the optimistic user message on error.
      setChatMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsChatting(false);
    }
  };

  const handleUndo = async () => {
    if (!agentTaskId || isUndoing || chatMessages.length === 0) return;

    setIsUndoing(true);
    setPrdImportError("");

    try {
      const response = await undoAgentTask(agentTaskId);
      setDraftTickets(response.data.draftTickets);
      // Remove the last user + assistant message pair from the local chat display.
      setChatMessages((prev) => prev.slice(0, -2));
    } catch (err) {
      setPrdImportError(err?.response?.data?.message || "Undo failed.");
    } finally {
      setIsUndoing(false);
    }
  };

  // Save the draft to the board once the user is happy with it.
  const handleConfirmDraft = async () => {
    if (!agentTaskId || draftTickets.length === 0) {
      setPrdImportError("Generate a draft before confirming.");
      return;
    }

    setIsConfirmingDraft(true);
    setPrdImportError("");

    try {
      const token = await getTokenWithTimeout();

      const draftResponse = await fetch(
        `${getApiBaseUrl()}/api/agent-tasks/${agentTaskId}/draft`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ draftTickets }),
        },
      );

      if (!draftResponse.ok) {
        const payload = await draftResponse.json();
        throw new Error(payload?.message || "Failed to save draft.");
      }

      const confirmResponse = await fetch(
        `${getApiBaseUrl()}/api/agent-tasks/${agentTaskId}/confirm`,
        {
          method: "POST",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        },
      );

      if (!confirmResponse.ok) {
        const payload = await confirmResponse.json();
        throw new Error(payload?.message || "Failed to confirm draft.");
      }

      const refreshToken = await getTokenWithTimeout();
      const refreshed = await fetch(
        `${getApiBaseUrl()}/api/tasks/${projectId}`,
        {
          headers: refreshToken ? { Authorization: `Bearer ${refreshToken}` } : {},
        },
      );
      const payload = await refreshed.json();
      setTasks(payload);

      setPrdImportSuccess("Draft confirmed and added to the board.");
      setPrdText("");
      setDraftTickets([]);
      setAgentTaskId("");
    } catch (err) {
      setPrdImportError(err?.message || "Failed to confirm draft.");
    } finally {
      setIsConfirmingDraft(false);
    }
  };

  const projectTitle =
    project?.projectTitle || "Project";

  const leadLabel = project?.projectLead
    ? `${project.projectLead.firstName} ${project.projectLead.lastName}`
    : "Project lead";

  const targetDateLabel = project?.targetDate
    ? dayjs(project.targetDate).format("YYYY-MM-DD")
    : "Target date";

  const statusLabel = project?.status || "Status";

  return (
    <Box
      sx={{
        p: 2.5,
        width: "100%",
        maxWidth: "none",
      }}
    >
      {/* Keep header aligned with the board's full scroll width */}
      <Box sx={{ overflowX: "auto", pb: 0.5, mb: 2 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            width: "max-content",
            minWidth: "100%",
            // Kanban columns are fixed-width; this makes the button sit above "Done"
            // even when the board is wider than the viewport.
          }}
        >
          <Typography component="h1" variant="h5" fontWeight={700}>
            {projectTitle} Tasks
          </Typography>

          <Button
            variant="contained"
            color="primary"
            onClick={handleCreateTask}
            sx={{ ml: "auto", flexShrink: 0 }}
          >
            + Create Task
          </Button>

          <Button
            variant="outlined"
            color="primary"
            onClick={handleOpenPrdImport}
            sx={{ flexShrink: 0 }}
          >
            Import PRD
          </Button>
        </Box>

        <Box sx={{ mt: 1.25, width: "max-content", minWidth: "100%" }}>
          <Stack spacing={1}>
            <Typography variant="body2" color="text.secondary">
              {project?.description || ""}
            </Typography>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip
                clickable
                variant="outlined"
                label={leadLabel}
                sx={(theme) => ({
                  fontWeight: 600,
                  color:
                    theme.palette.mode === "dark"
                      ? theme.palette.primary.main
                      : undefined,
                  borderColor:
                    theme.palette.mode === "dark"
                      ? theme.palette.primary.main
                      : undefined,
                  backgroundColor:
                    theme.palette.mode === "dark"
                      ? "rgba(168, 85, 247, 0.10)"
                      : undefined,
                })}
              />
              <Chip
                clickable
                variant="outlined"
                label={targetDateLabel}
                sx={(theme) => ({
                  fontWeight: 600,
                  color:
                    theme.palette.mode === "dark"
                      ? theme.palette.primary.main
                      : undefined,
                  borderColor:
                    theme.palette.mode === "dark"
                      ? theme.palette.primary.main
                      : undefined,
                  backgroundColor:
                    theme.palette.mode === "dark"
                      ? "rgba(168, 85, 247, 0.10)"
                      : undefined,
                })}
              />
              <Chip
                clickable
                variant="outlined"
                label={statusLabel}
                sx={(theme) => ({
                  fontWeight: 600,
                  color:
                    theme.palette.mode === "dark"
                      ? theme.palette.primary.main
                      : undefined,
                  borderColor:
                    theme.palette.mode === "dark"
                      ? theme.palette.primary.main
                      : undefined,
                  backgroundColor:
                    theme.palette.mode === "dark"
                      ? "rgba(168, 85, 247, 0.10)"
                      : undefined,
                })}
              />
            </Stack>
          </Stack>
        </Box>

        <Box sx={{ mt: 2, width: "max-content", minWidth: "100%" }}>
          <KanbanBoard
            tasks={tasks}
            setTasks={setTasks}
            onTaskClick={handleTaskClick}
          />
        </Box>
      </Box>

      <TaskModal
        key={`${taskModalKey}-${selectedTask?._id || "new"}`}
        open={open}
        setOpen={setOpen}
        selectedTask={selectedTask}
        tasks={tasks}
        setTasks={setTasks}
        members={members}
        projectId={projectId}
      />

      <Dialog
        open={openPrdImport}
        onClose={handleClosePrdImport}
        fullWidth
        maxWidth={draftTickets.length > 0 ? "xl" : "md"}
      >
        <DialogTitle>Import PRD</DialogTitle>

        <DialogContent>
          {draftTickets.length === 0 ? (
            // Step 1: PRD input
            <Stack spacing={2} sx={{ pt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Paste the PRD here to generate a draft. Once generated, you can refine tickets via chat before confirming them to the board.
              </Typography>
              {prdImportError ? <Alert severity="error">{prdImportError}</Alert> : null}
              <TextField
                label="PRD text"
                value={prdText}
                onChange={(e) => setPrdText(e.target.value)}
                multiline
                minRows={14}
                fullWidth
                placeholder="Paste the full PRD here..."
              />
            </Stack>
          ) : (
            // Step 2: two-panel refinement view
            <Box sx={{ display: "flex", gap: 2, pt: 1, height: 560 }}>
              {/* Left: draft ticket preview */}
              <Box
                sx={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  minWidth: 0,
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    mb: 1,
                  }}
                >
                  <Typography variant="subtitle1" fontWeight={700}>
                    Draft preview ({draftTickets.length})
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={handleUndo}
                    disabled={isUndoing || chatMessages.length === 0}
                    title="Undo last turn"
                  >
                    {isUndoing ? <CircularProgress size={16} /> : <UndoIcon fontSize="small" />}
                  </IconButton>
                </Box>

                {prdImportError ? (
                  <Alert severity="error" sx={{ mb: 1 }}>
                    {prdImportError}
                  </Alert>
                ) : null}
                {prdImportSuccess ? (
                  <Alert severity="success" sx={{ mb: 1 }}>
                    {prdImportSuccess}
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
                        <Stack direction="row" spacing={0.5} sx={{ mt: 0.75 }}>
                          <Chip label={ticket.type} size="small" variant="outlined" />
                          <Chip label={ticket.priority} size="small" variant="outlined" />
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
                    <Box sx={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 1 }}>
                      <CircularProgress size={14} />
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
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClosePrdImport} disabled={isSubmittingPrd || isChatting}>
            Cancel
          </Button>
          {draftTickets.length === 0 ? (
            <Button onClick={handleSubmitPrd} variant="contained" disabled={isSubmittingPrd}>
              {isSubmittingPrd ? "Generating..." : "Generate Draft"}
            </Button>
          ) : (
            <Button
              onClick={handleConfirmDraft}
              variant="contained"
              disabled={isConfirmingDraft || isChatting}
            >
              {isConfirmingDraft ? "Confirming..." : "Confirm to Board"}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}