import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Box from "@mui/material/Box";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Alert from "@mui/material/Alert";
import Divider from "@mui/material/Divider";
import dayjs from "dayjs";

import KanbanBoard from "../components/KanbanBoard";
import TaskModal from "../components/TaskModal";
import { getProjectDetails } from "../services/projectSpaceService";
import { createAgentTask } from "../services/agentTasksService";
import { getApiBaseUrl } from "../lib/apiBaseUrl";
import { supabase } from "../lib/supabaseClient";

// Split the PRD into a few simple draft tickets for the MVP.
const makeDraftTickets = (prdText) => {
  const lines = prdText
    .split(/[\n\.]/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 3);

  const tickets = lines.length > 0 ? lines : [prdText.trim()];

  return tickets.map((line, index) => ({
    title: index === 0 ? "Review PRD and confirm scope" : `Draft ticket ${index + 1}`,
    description: line,
    acceptance_criteria: ["User can review the draft", "User can confirm the draft to create tasks"],
    type: index === 0 ? "Feature" : "Improvement",
    priority: index === 0 ? "High" : "Medium",
  }));
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
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
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
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;

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

  // Reset the import state each time the modal opens.
  const handleOpenPrdImport = () => {
    setPrdImportError("");
    setPrdImportSuccess("");
    setAgentTaskId("");
    setDraftTickets([]);
    setOpenPrdImport(true);
  };

  const handleClosePrdImport = () => {
    setOpenPrdImport(false);
    setPrdImportError("");
    setPrdImportSuccess("");
    setAgentTaskId("");
    setDraftTickets([]);
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
      const drafts = makeDraftTickets(prdText.trim());

      setAgentTaskId(agentTask?.id || "");
      setDraftTickets(drafts);

      setPrdImportSuccess(
        agentTask
          ? `Draft ready for review. Agent task ${agentTask.id} is storing the PRD.`
          : "Draft ready for review.",
      );
    } catch (err) {
      const message = err?.response?.data?.message || "PRD import failed.";
      setPrdImportError(message);
    } finally {
      setIsSubmittingPrd(false);
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
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;

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

      const refreshed = await fetch(
        `${getApiBaseUrl()}/api/tasks/${projectId}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
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

      <Dialog open={openPrdImport} onClose={handleClosePrdImport} fullWidth maxWidth="md">
        <DialogTitle>Import PRD</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Paste the PRD here to create a lightweight draft, review the generated tickets, then confirm them onto the board.
            </Typography>

            {prdImportError ? <Alert severity="error">{prdImportError}</Alert> : null}
            {prdImportSuccess ? <Alert severity="success">{prdImportSuccess}</Alert> : null}

            <TextField
              label="PRD text"
              value={prdText}
              onChange={(e) => setPrdText(e.target.value)}
              multiline
              minRows={12}
              fullWidth
              placeholder="Paste the full PRD here..."
            />

            {draftTickets.length > 0 ? (
              <>
                <Divider />
                <Stack spacing={1.5}>
                  <Typography variant="subtitle1" fontWeight={700}>
                    Draft preview
                  </Typography>
                  {draftTickets.map((ticket, index) => (
                    <Box
                      key={`${ticket.title}-${index}`}
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
                      <Typography variant="body2" color="text.secondary">
                        {ticket.description}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {ticket.type} · {ticket.priority}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePrdImport} disabled={isSubmittingPrd}>
            Cancel
          </Button>
          <Button onClick={handleSubmitPrd} variant="outlined" disabled={isSubmittingPrd}>
            {isSubmittingPrd ? "Generating..." : "Generate Draft"}
          </Button>
          <Button
            onClick={handleConfirmDraft}
            variant="contained"
            disabled={isConfirmingDraft || draftTickets.length === 0}
          >
            {isConfirmingDraft ? "Confirming..." : "Confirm Draft"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}