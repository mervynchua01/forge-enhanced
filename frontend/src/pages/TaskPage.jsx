import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import dayjs from "dayjs";

import KanbanBoard from "../components/KanbanBoard";
import TaskModal from "../components/TaskModal";
import PageHeader from "../components/ui/PageHeader";
import { StatusChip } from "../components/ui/MetaChips";
import api from "../services/api";
import { getProjectDetails } from "../services/projectSpaceService";

export default function TaskPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [project, setProject] = useState(null);
  const [open, setOpen] = useState(false);
  const [selectedTask, setSelectedTask] =
    useState(null);
  const [taskModalKey, setTaskModalKey] = useState(0);

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
      const res = await api.get(`/tasks/${projectId}`);
      if (!cancelled) setTasks(res.data);
    })().catch(console.error);

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const res = await api.get(`/projects/${projectId}/members`);
      if (!cancelled) setMembers(res.data);
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
        {/* Kanban columns are fixed-width; max-content keeps the actions above
            "Done" even when the board is wider than the viewport. */}
        <PageHeader
          title={`${projectTitle} Tasks`}
          subtitle={project?.description || ""}
          sx={{ width: "max-content", minWidth: "100%", mb: 0 }}
          actions={
            <>
              <Button
                variant="contained"
                color="primary"
                onClick={handleCreateTask}
              >
                + Create Task
              </Button>

              <Button
                variant="outlined"
                color="primary"
                onClick={() => navigate(`/home?projectId=${projectId}`)}
              >
                Import PRD
              </Button>
            </>
          }
        >
          <Stack
            direction="row"
            spacing={1}
            flexWrap="wrap"
            useFlexGap
            sx={{ mt: 1.25 }}
          >
            <Chip variant="outlined" size="small" label={`Lead: ${leadLabel}`} />
            <Chip
              variant="outlined"
              size="small"
              label={`Due: ${targetDateLabel}`}
            />
            <StatusChip value={statusLabel} />
          </Stack>
        </PageHeader>

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
    </Box>
  );
}