import {
  Box,
  Card,
  CardContent,
  Typography,
  CardActionArea,
  IconButton,
  Dialog,
  DialogContent,
  Stack,
  LinearProgress,
} from "@mui/material";
import { useEffect, useState } from "react";
import * as workspaceService from "../services/projectSpaceService";
import UserAvatar from "./UserAvatar";
import AvatarGroup from "@mui/material/AvatarGroup";
import { useAuth } from "../context/AuthContext";
import CreateProjectForm from "./CreateProjectForm";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import EditProjectForm from "./EditProjectForm";
import PageHeader from "./ui/PageHeader";
import { useNavigate } from "react-router-dom";

const ProjectSpace = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [openProjectForm, setOpenProjectForm] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [openEditForm, setOpenEditForm] = useState(false);

  const fetchWorkspace = async () => {
    try {
      const workspaceData = await workspaceService.getProjects(user);
      const projectsData = workspaceData.data.projects || [];
      const projectsDataWithProgress = await Promise.all(
        projectsData.map(async (proj) => {
          try {
            const progressData = await workspaceService.getProjectProgress(
              proj._id,
            );
            return {
              ...proj,
              progress: progressData.data,
            };
          } catch (err) {
            console.error(
              `Failed to fetch progress for ${proj.projectKey}`,
              err,
            );
            return { ...proj, progress: { completed: 0, total: 0 } };
          }
        }),
      );
      setProjects(projectsDataWithProgress);
    } catch (err) {
      console.error("Failed to fetch workspace:", err);
    }
  };

  useEffect(() => {
    fetchWorkspace();
  }, []);

  return (
    <>
      <PageHeader
        title="Projects"
        subtitle="Everything your team is forging right now."
      />

      <Box
        sx={{
          width: "100%",
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fill, minmax(min(200px, 100%), 1fr))",
          gap: 2,
        }}
      >
        <Card sx={{ border: "none", boxShadow: "none", bgcolor: "transparent" }}>
          <CardActionArea
            sx={{
              height: "100%",
              borderRadius: "inherit",
              border: "2px dashed",
              borderColor: "divider",
              color: "primary.main",
              transition: "border-color 0.2s ease, background-color 0.2s ease",
              "&:hover": {
                borderColor: "primary.main",
                bgcolor: "forge.glowSoft",
              },
            }}
            onClick={() => setOpenProjectForm(true)}
          >
            <CardContent
              sx={{
                textAlign: "center",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 0.75,
              }}
            >
              <AddIcon fontSize="small" />
              <Typography variant="h6">New Project</Typography>
            </CardContent>
          </CardActionArea>
          <Dialog
            open={openProjectForm}
            onClose={() => setOpenProjectForm(false)}
            fullWidth
            maxWidth="sm"
          >
            <DialogContent>
              <CreateProjectForm
                onClose={() => {
                  setOpenProjectForm(false);
                  fetchWorkspace();
                }}
              />
            </DialogContent>
          </Dialog>
        </Card>
        {projects?.map((project) => {
          const isProjectLead = user && project?.projectLead?._id === user._id;
          return (
            <Card key={project._id} sx={{ position: "relative" }}>
              {isProjectLead && (
                <IconButton
                  size="small"
                  sx={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    zIndex: 2,
                    color: "primary.main",
                    bgcolor: "background.paper",
                    boxShadow: 1,
                    "&:hover": {
                      bgcolor: "primary.main",
                      color: "white",
                    },
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedProjectId(project._id);
                    setOpenEditForm(true);
                  }}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              )}
              <CardActionArea
                onClick={() => navigate(`/tasks/${project._id}`)}
                sx={{
                  height: "100%",
                }}
              >
                <CardContent>
                  <Stack spacing={1}>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="flex-start"
                    ></Stack>
                    <Box>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontWeight: 700 }}
                      >
                        {project.projectKey}
                      </Typography>
                      <Typography variant="h6" sx={{ lineHeight: 1.2, mb: 1 }}>
                        {project.projectTitle}
                      </Typography>
                    </Box>
                  </Stack>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ height: 40, overflow: "hidden" }}
                  >
                    {project.description}
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>
                      {project.progress.completed} / {project.progress.total}{" "}
                      tasks completed
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={
                        project.progress.total > 0
                          ? (project.progress.completed /
                              project.progress.total) *
                            100
                          : 0
                      }
                      sx={{ mt: 0.5, height: 6, borderRadius: 3 }}
                    />
                  </Box>

                  <AvatarGroup
                    max={4}
                    total={(project.members?.length || 0) + 1}
                    sx={{ justifyContent: "flex-end", mt: 1 }}
                  >
                    <UserAvatar
                      name={
                        project.projectLead
                          ? `${project.projectLead.firstName} ${project.projectLead.lastName}`
                          : "Project lead"
                      }
                    />
                    {(project.members || []).map((member) => (
                      <UserAvatar
                        key={member._id}
                        name={`${member.firstName} ${member.lastName}`}
                      />
                    ))}
                  </AvatarGroup>
                </CardContent>
              </CardActionArea>
            </Card>
          );
        })}

        <Dialog
          open={openEditForm}
          onClose={() => setOpenEditForm(false)}
          fullWidth
          maxWidth="sm"
        >
          <DialogContent>
            <EditProjectForm
              projectId={selectedProjectId}
              onClose={() => {
                setOpenEditForm(false);
                fetchWorkspace();
              }}
            />
          </DialogContent>
        </Dialog>
      </Box>
    </>
  );
};

export default ProjectSpace;
