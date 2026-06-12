import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  IconButton,
  Alert,
  MenuItem,
  Chip,
  CircularProgress,
  InputBase,
} from "@mui/material";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import dayjs from "dayjs";

import PrdRefinementPanel from "../components/PrdRefinementPanel";
import { createProject, getProjects } from "../services/projectSpaceService";
import { createAgentTask } from "../services/agentTasksService";

// PRD-first landing hero: paste or upload a PRD, choose where to save it
// (a new or existing project), then generate and refine draft tickets.
export default function PrdImportHero() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedProjectId = searchParams.get("projectId");

  const [prdText, setPrdText] = useState("");
  const [uploadedFile, setUploadedFile] = useState(null); // { name, base64, mimeType }
  const fileInputRef = useRef(null);

  const [saveTarget, setSaveTarget] = useState(
    preselectedProjectId ? "existing" : "new",
  );
  const [projectTitle, setProjectTitle] = useState("");
  const [projectKey, setProjectKey] = useState("");
  const [projects, setProjects] = useState([]);
  const [existingProjectId, setExistingProjectId] = useState(
    preselectedProjectId || "",
  );

  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");

  // Result of generation: the draft is handed off to the refinement panel.
  const [agentTaskId, setAgentTaskId] = useState("");
  const [draftTickets, setDraftTickets] = useState([]);
  const [savedProjectId, setSavedProjectId] = useState("");
  // If we created a new project but generation then failed, remember it so a
  // retry reuses it instead of colliding on the (now-taken) project key.
  const [createdProjectId, setCreatedProjectId] = useState("");

  // Load the user's projects for the "existing project" picker.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await getProjects();
        if (!cancelled) setProjects(response?.data?.projects || []);
      } catch (err) {
        console.error("Failed to load projects", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Handle file selection from the hidden <input type="file">.
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const mimeType = file.type;

    if (mimeType === "text/plain") {
      // Plain text: read directly into the textarea so the user can see it.
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPrdText(ev.target.result);
        setUploadedFile(null);
      };
      reader.readAsText(file);
    } else if (mimeType === "application/pdf") {
      // PDF: convert to base64 and store; we'll send it to the backend.
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = ev.target.result.split(",")[1];
        setUploadedFile({ name: file.name, base64, mimeType });
        setPrdText(""); // Clear text since file takes precedence
      };
      reader.readAsDataURL(file);
    } else {
      setError("Only PDF and .txt files are supported.");
    }

    // Reset input so the same file can be re-selected if needed.
    e.target.value = "";
  };

  const handleGenerate = async () => {
    const hasText = prdText.trim().length > 0;
    const hasPdf = !!uploadedFile;

    if (!hasText && !hasPdf) {
      setError("Paste a PRD or upload a file before generating.");
      return;
    }

    if (saveTarget === "new" && (!projectTitle.trim() || !projectKey.trim())) {
      setError("Enter a project title and key.");
      return;
    }
    if (saveTarget === "existing" && !existingProjectId) {
      setError("Select a project to save to.");
      return;
    }

    setIsGenerating(true);
    setError("");

    try {
      // 1. Ensure a project exists to hold the tickets. Reuse the project from
      // an earlier failed attempt so retries don't collide on the project key.
      let projectId = existingProjectId;
      if (saveTarget === "new") {
        if (createdProjectId) {
          projectId = createdProjectId;
        } else {
          const projectResponse = await createProject({
            projectTitle: projectTitle.trim(),
            projectKey: projectKey.trim().toUpperCase(),
            description: "Imported from PRD",
            members: [],
            targetDate: dayjs().add(30, "day").format("YYYY-MM-DD"),
            status: "To Do",
          });
          projectId = projectResponse?.data?.project?._id;
          if (!projectId) throw new Error("Failed to create project.");
          setCreatedProjectId(projectId);
        }
      }

      // 2. Generate draft tickets from the PRD text or uploaded file.
      const payload = hasPdf
        ? { prdFileBase64: uploadedFile.base64, mimeType: uploadedFile.mimeType }
        : { prdText: prdText.trim() };

      const response = await createAgentTask(projectId, payload);
      const agentTask = response?.data?.agentTask;
      const drafts = response?.data?.draftTickets ?? [];

      setSavedProjectId(projectId);
      setAgentTaskId(agentTask?.id || "");
      setDraftTickets(drafts);
    } catch (err) {
      const message =
        err?.response?.data?.message || err?.message || "PRD import failed.";
      setError(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const hasDraft = draftTickets.length > 0;
  const hasInput = prdText.trim().length > 0 || !!uploadedFile;

  // Once a draft exists, hand the whole surface over to the refinement panel.
  if (hasDraft) {
    return (
      <Box sx={{ maxWidth: 920, mx: "auto", py: 4 }}>
        <Paper
          elevation={0}
          sx={{ p: 3, border: "1px solid", borderColor: "divider", borderRadius: 4 }}
        >
          {error ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          ) : null}
          <PrdRefinementPanel
            agentTaskId={agentTaskId}
            draftTickets={draftTickets}
            setDraftTickets={setDraftTickets}
            onConfirmed={() => navigate(`/tasks/${savedProjectId}`)}
          />
        </Paper>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        maxWidth: 720,
        mx: "auto",
        minHeight: "70vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      {/* Headline */}
      <Typography
        variant="h4"
        fontWeight={600}
        textAlign="center"
        sx={{ mb: 1 }}
      >
        Start building your next product
      </Typography>
      <Typography
        variant="body1"
        color="text.secondary"
        textAlign="center"
        sx={{ mb: 4 }}
      >
        Paste your PRD. We&apos;ll forge the tickets.
      </Typography>

      {error ? (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 3 }}>
          {error}
        </Alert>
      ) : null}

      {/* Prompt box: paste area with upload tucked inside and a circular submit. */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          borderRadius: 5,
          border: "1px solid",
          borderColor: "divider",
          transition: "border-color 0.2s ease, box-shadow 0.2s ease",
          "&:focus-within": {
            borderColor: "primary.main",
            boxShadow: (theme) =>
              `0 0 0 3px ${theme.palette.mode === "dark" ? "rgba(168,85,247,0.18)" : "rgba(107,33,168,0.10)"}`,
          },
        }}
      >
        <InputBase
          value={prdText}
          onChange={(e) => setPrdText(e.target.value)}
          placeholder="Paste your PRD here, or upload a file..."
          multiline
          minRows={4}
          maxRows={14}
          fullWidth
          sx={{ px: 1, py: 0.5, fontSize: "1rem", alignItems: "flex-start" }}
        />

        {/* Bottom controls row */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mt: 1,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.pdf,text/plain,application/pdf"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
            {uploadedFile ? (
              <Chip
                label={uploadedFile.name}
                onDelete={() => setUploadedFile(null)}
                variant="outlined"
                size="small"
                sx={{ borderRadius: 999 }}
              />
            ) : (
              <Button
                size="small"
                startIcon={<AttachFileIcon fontSize="small" />}
                onClick={() => fileInputRef.current?.click()}
                sx={{
                  textTransform: "none",
                  borderRadius: 999,
                  color: "text.secondary",
                  bgcolor: "action.hover",
                  "&:hover": { bgcolor: "action.selected" },
                }}
              >
                Upload .pdf / .txt
              </Button>
            )}
          </Box>

          <IconButton
            onClick={handleGenerate}
            disabled={isGenerating || !hasInput}
            sx={{
              bgcolor: "primary.main",
              color: "primary.contrastText",
              width: 38,
              height: 38,
              "&:hover": { bgcolor: "primary.dark" },
              "&.Mui-disabled": {
                bgcolor: "action.disabledBackground",
                color: "action.disabled",
              },
            }}
          >
            {isGenerating ? (
              <CircularProgress size={18} color="inherit" />
            ) : (
              <ArrowUpwardIcon fontSize="small" />
            )}
          </IconButton>
        </Box>
      </Paper>

      {/* Save-to controls, styled as a row of pills below the prompt box. */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 1,
          flexWrap: "wrap",
          mt: 2.5,
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Save to
        </Typography>

        <TextField
          select
          value={saveTarget}
          onChange={(e) => setSaveTarget(e.target.value)}
          size="small"
          sx={pillFieldSx(160)}
        >
          <MenuItem value="new">New project</MenuItem>
          <MenuItem value="existing">Existing project</MenuItem>
        </TextField>

        {saveTarget === "new" ? (
          <>
            <TextField
              placeholder="Project title"
              value={projectTitle}
              onChange={(e) => {
                setProjectTitle(e.target.value);
                setCreatedProjectId("");
              }}
              size="small"
              sx={pillFieldSx(180)}
            />
            <TextField
              placeholder="KEY"
              value={projectKey}
              onChange={(e) => {
                setProjectKey(e.target.value.toUpperCase());
                setCreatedProjectId("");
              }}
              size="small"
              sx={pillFieldSx(110)}
            />
          </>
        ) : (
          <TextField
            select
            value={existingProjectId}
            onChange={(e) => setExistingProjectId(e.target.value)}
            size="small"
            displayEmpty
            sx={pillFieldSx(240)}
            SelectProps={{
              renderValue: (value) => {
                if (!value) return "Select a project";
                const p = projects.find((proj) => proj._id === value);
                return p ? `${p.projectKey} — ${p.projectTitle}` : "Select a project";
              },
            }}
          >
            {projects.length === 0 ? (
              <MenuItem value="" disabled>
                No projects yet
              </MenuItem>
            ) : (
              projects.map((p) => (
                <MenuItem key={p._id} value={p._id}>
                  {p.projectKey} — {p.projectTitle}
                </MenuItem>
              ))
            )}
          </TextField>
        )}
      </Box>
    </Box>
  );
}

// Rounded "pill" styling for the inline save-to fields.
const pillFieldSx = (minWidth) => ({
  minWidth,
  "& .MuiOutlinedInput-root": {
    borderRadius: 999,
    bgcolor: "action.hover",
    "& fieldset": { borderColor: "transparent" },
    "&:hover fieldset": { borderColor: "divider" },
    "&.Mui-focused fieldset": { borderColor: "primary.main" },
  },
});
