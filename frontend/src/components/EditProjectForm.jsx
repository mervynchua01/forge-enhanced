import {
  Paper,
  Typography,
  TextField,
  Button,
  Autocomplete,
  MenuItem,
  Stack,
} from "@mui/material";
import { useState, useEffect, useMemo } from "react";
import {
  queryUserByName,
  getProjectDetails,
  editProject,
} from "../services/projectSpaceService";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import { debounce } from "lodash";

function EditProjectForm({ projectId, onClose }) {
  const [projectData, setProjectData] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [membersList, setMembersList] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    const fetchProject = async () => {
      try {
        const response = await getProjectDetails(projectId);
        const data = response.data.project;
        setProjectData(data);
        setEditForm(data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchProject();
  }, [projectId]);

  const debouncedFetch = useMemo(
    () =>
      debounce(async (query, callback) => {
        setLoading(true);
        try {
          const response = await queryUserByName(query);
          callback(response.data);
        } catch (err) {
          console.error("search failed", err);
        } finally {
          setLoading(false);
        }
      }, 500),
    [],
  );

  const handleSearch = (event, newInputValue) => {
    debouncedFetch(newInputValue, (results) => setMembersList(results));
  };

  const handleSave = async () => {
    try {
      await editProject(projectId, editForm);
      onClose();
    } catch (err) {
      console.error("Failed to update project", err);
    }
  };

  if (!projectData) return <Typography sx={{ p: 4 }}>Loading...</Typography>;

  return (
    <Paper
      elevation={0}
      sx={{
        width: "100%",
        p: 1,
        position: "relative",
      }}
    >
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <Stack spacing={3}>
          <Typography variant="h5">Edit Project</Typography>
          <TextField
            label="Project Title"
            fullWidth
            value={editForm.projectTitle || ""}
            onChange={(e) =>
              setEditForm({ ...editForm, projectTitle: e.target.value })
            }
          />
          <TextField
            label="Project Key"
            fullWidth
            value={editForm.projectKey || ""}
            onChange={(e) =>
              setEditForm({ ...editForm, projectKey: e.target.value })
            }
          />
          <TextField
            label="Description"
            fullWidth
            multiline
            rows={3}
            value={editForm.description || ""}
            onChange={(e) =>
              setEditForm({ ...editForm, description: e.target.value })
            }
          />
          <TextField
            disabled
            name="projectLead"
            id="project-lead-input"
            label="Project Lead"
            value={`${editForm.projectLead.firstName} ${editForm.projectLead.lastName}`}
            variant="outlined"
            size="small"
            fullWidth
          />
          <Autocomplete
            multiple
            fullWidth
            label="Project Members"
            value={editForm.members || []}
            options={membersList}
            getOptionLabel={(option) =>
              `${option.firstName} ${option.lastName}`
            }
            loading={loading}
            onFocus={() => {
              if (membersList.length === 0) {
                handleSearch(null, "");
              }
            }}
            onInputChange={(event, value) => handleSearch(event, value)}
            onChange={(event, newValue) => {
              setEditForm({ ...editForm, members: newValue });
            }}
            isOptionEqualToValue={(option, value) => option._id === value._id}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Project Members"
                placeholder="Add members..."
              />
            )}
          />
          <DatePicker
            slotProps={{
              openPickerButton: { color: "primary" },
              inputAdornment: { component: "span" },
            }}
            name="targetDate"
            id="target-date-input"
            label="Target Date"
            value={editForm.targetDate ? dayjs(editForm.targetDate) : null}
            onChange={(newValue) =>
              setEditForm((prev) => ({ ...prev, targetDate: newValue }))
            }
          />
          <TextField
            select
            name="status"
            id="status-input"
            label="Status"
            value={editForm.status}
            onChange={(e) =>
              setEditForm({ ...editForm, status: e.target.value })
            }
            fullWidth
          >
            <MenuItem value={"To Do"}>To Do</MenuItem>
            <MenuItem value={"In Progress"}>In Progress</MenuItem>
            <MenuItem value={"In Review"}>In Review</MenuItem>
            <MenuItem value={"Completed"}>Completed</MenuItem>
          </TextField>
          <Stack
            direction="row"
            spacing={2}
            justifyContent="flex-end"
            sx={{ mt: 2 }}
          >
            <Button variant="outlined" onClick={onClose} color="inherit">
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleSave}
              color="primary"
              sx={{ px: 4 }}
            >
              Save Changes
            </Button>
          </Stack>
        </Stack>
      </LocalizationProvider>
    </Paper>
  );
}

export default EditProjectForm;
