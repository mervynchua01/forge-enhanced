import { useMemo, useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  Autocomplete,
  MenuItem,
  Stack,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { debounce } from "lodash";
import {
  createProject,
  queryUserByName,
} from "../services/projectSpaceService";
import { useAuth } from "../context/AuthContext";

const CreateProjectForm = ({ onClose }) => {
  const { user } = useAuth();
  const [errorMessage, setErrorMessage] = useState("");
  const [formData, setFormData] = useState({
    projectTitle: "",
    projectKey: "",
    description: "",
    projectLead: user ? `${user.firstName} ${user.lastName}` : "",
    members: [],
    targetDate: null,
    status: "To Do",
  });

  const [membersList, setMembersList] = useState([]);
  const [loading, setLoading] = useState(false);

  const debouncedFetch = useMemo(
    () =>
      debounce(async (query, callback) => {
        // if (query.length < 2) return;
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

  const handleChange = (evt) => {
    setErrorMessage("");
    setFormData({ ...formData, [evt.target.name]: evt.target.value });
  };

  const handleSubmit = async (evt) => {
    evt.preventDefault();

    const normalizedTitle = formData.projectTitle.trim();
    const normalizedKey = formData.projectKey.trim().toUpperCase();

    if (
      !normalizedTitle ||
      !normalizedKey ||
      !formData.description.trim() ||
      !formData.targetDate
    ) {
      setErrorMessage("Please fill in compulsory field.");
      return;
    }

    const projectData = {
      ...formData,
      projectTitle: normalizedTitle,
      projectKey: normalizedKey,
      members: formData.members.map((member) => member._id),
      targetDate: formData.targetDate
        ? formData.targetDate.format("YYYY-MM-DD")
        : null,
    };
    try {
      console.log("Creating project payload:", projectData);
      const response = await createProject(projectData);
      console.log("Project created successfully", response.data);
      onClose();
    } catch (err) {
      console.error("Failed to create project", err.response?.data || err.message);
      setErrorMessage(
        err?.response?.data?.value
          ? `${err?.response?.data?.message} (${JSON.stringify(err?.response?.data?.value)})`
          : err?.response?.data?.message ||
          "Failed to create project. Please try again.",
      );
    }
  };

  // Rendered inside a <Dialog>, so this is plain content — no page chrome.
  return (
    <Box sx={{ pt: 0.5 }}>
      <Typography variant="h5" mb={2}>
        Create a New Project
      </Typography>

        <Box
          component="form"
          sx={{ display: "flex", flexDirection: "column", gap: 2 }}
          autoComplete="off"
          onSubmit={handleSubmit}
        >
          {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

          <TextField
            required
            name="projectTitle"
            id="project-title-input"
            label="Project Title"
            value={formData.projectTitle}
            onChange={handleChange}
            variant="outlined"
            size="small"
            fullWidth
          />
          <TextField
            required
            name="projectKey"
            id="project-key-input"
            label="Project Key"
            value={formData.projectKey}
            onChange={handleChange}
            variant="outlined"
            size="small"
            fullWidth
          />
          <TextField
            required
            multiline
            rows={3}
            name="description"
            id="description-input"
            label="Project Description"
            value={formData.description}
            onChange={handleChange}
            variant="outlined"
            size="small"
            fullWidth
          />
          <TextField
            required
            disabled
            name="projectLead"
            id="project-lead-input"
            label="Project Lead"
            value={formData.projectLead}
            variant="outlined"
            size="small"
            fullWidth
          />
          <Autocomplete
            required
            multiple
            name="members"
            id="members-input"
            label="Project Members"
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
              // newValue is the updated array of selected members
              setFormData({ ...formData, members: newValue });
            }}
            renderOption={(props, option) => (
              <li {...props} key={option._id}>
                {option.firstName} {option.lastName}
              </li>
            )}
            isOptionEqualToValue={(option, value) => option._id === value._id}
            variant="outlined"
            size="small"
            fullWidth
            renderInput={(params) => (
              <TextField
                {...params}
                label="Project Members"
                placeholder="Type to search..."
                size="small"
              />
            )}
          />
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              slotProps={{
                openPickerButton: { color: "primary" },
                inputAdornment: { component: "span" },
              }}
              required
              name="targetDate"
              id="target-date-input"
              label="Target Date"
              value={formData.targetDate}
              onChange={(newValue) =>
                (setErrorMessage(""),
                setFormData((prev) => ({ ...prev, targetDate: newValue })))
              }
            />
          </LocalizationProvider>
          <TextField
            required
            select
            name="status"
            id="status-input"
            label="Project Status"
            value={formData.status}
            onChange={handleChange}
            variant="outlined"
            size="small"
            fullWidth
          >
            <MenuItem value={"To Do"}>To Do</MenuItem>
            <MenuItem value={"In Progress"}>In Progress</MenuItem>
            <MenuItem value={"In Review"}>In Review</MenuItem>
            <MenuItem value={"Completed"}>Completed</MenuItem>
          </TextField>
          <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 1 }}>
            <Button variant="outlined" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" color="primary">
              Create
            </Button>
          </Stack>
        </Box>
    </Box>
  );
};

export default CreateProjectForm;
