import * as React from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Chip from "@mui/material/Chip";
import Avatar from "@mui/material/Avatar";
import Alert from "@mui/material/Alert";
import { supabase } from "../lib/supabaseClient";
import { getApiBaseUrl } from "../lib/apiBaseUrl";

const VALIDATION_MESSAGE = "Please fill in compulsory field.";

function createEmptyForm() {
  return {
    title: "",
    description: "",
    assignees: [],
    type: "",
    status: "",
    priority: "",
  };
}

export default function TaskModal({
  open,
  setOpen,

  selectedTask,

  tasks,
  setTasks,

  members,

  projectId,
}) {
  const [form, setForm] = React.useState(() =>
    selectedTask
      ? {
          title: selectedTask.title || "",
          description: selectedTask.description || "",
          assignees: selectedTask.assignees?.map((u) => u._id) || [],
          type: selectedTask.type || "",
          status: selectedTask.status || "",
          priority: selectedTask.priority || "",
        }
      : createEmptyForm(),
  );
  const [assigneePick, setAssigneePick] = React.useState("");
  const [formError, setFormError] = React.useState("");

  const handleClose = () => {
    setFormError("");
    setOpen(false);
  };

  const handleChange = (e) => {
    setFormError("");
    setForm({
      ...form,

      [e.target.name]: e.target.value,
    });
  };

  const handleAddAssignee = (userId) => {
    if (!userId || form.assignees.includes(userId)) return;

    setFormError("");
    setForm({
      ...form,

      assignees: [...form.assignees, userId],
    });
  };

  const handleRemoveAssignee = (userId) => {
    setForm({
      ...form,

      assignees: form.assignees.filter((id) => id !== userId),
    });
  };

  const isFormValid = () => {
    const titleOk = form.title.trim().length > 0;
    const descOk = form.description.trim().length > 0;
    const statusOk = Boolean(form.status);
    const typeOk = Boolean(form.type);
    const priorityOk = Boolean(form.priority);

    return titleOk && descOk && statusOk && typeOk && priorityOk;
  };

  const handleSubmit = async () => {
    if (!isFormValid()) {
      setFormError(VALIDATION_MESSAGE);
      return;
    }

    setFormError("");

    try {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      if (selectedTask) {
        const res = await fetch(
          `${getApiBaseUrl()}/api/tasks/${selectedTask._id}`,
          {
            method: "PATCH",

            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },

            body: JSON.stringify(form),
          },
        );

        const updatedTask = await res.json();

        const updatedTasks = tasks.map((t) =>
          t._id === updatedTask._id ? updatedTask : t,
        );

        setTasks(updatedTasks);
      } else {
        const res = await fetch(
          `${getApiBaseUrl()}/api/tasks`,
          {
            method: "POST",

            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },

            body: JSON.stringify({
              ...form,

              project: projectId,
            }),
          },
        );

        const newTask = await res.json();

        setTasks([newTask, ...tasks]);
      }

      handleClose();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      await fetch(
        `${getApiBaseUrl()}/api/tasks/${selectedTask._id}`,
        {
          method: "DELETE",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        },
      );

      setTasks(tasks.filter((t) => t._id !== selectedTask._id));

      handleClose();
    } catch (err) {
      console.error(err);
    }
  };

  const availableMembers = members.filter(
    (m) => !form.assignees.includes(m._id),
  );

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="sm"
      slotProps={{
        paper: {
          elevation: 0,
        },
      }}
    >
      <DialogTitle
        sx={{
          pr: 6,
          pb: 1,
        }}
      >
        <Typography variant="h5" component="span">
          {selectedTask ? "Edit Task" : "Create Task"}
        </Typography>

        <IconButton
          onClick={handleClose}
          sx={{
            position: "absolute",
            right: 8,
            top: 8,
          }}
          aria-label="close"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ pt: 2 }}>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          {formError ? (
            <Alert severity="error" onClose={() => setFormError("")}>
              {formError}
            </Alert>
          ) : null}

          <TextField
            required
            name="title"
            id="task-title-input"
            label="Title"
            value={form.title}
            onChange={handleChange}
            variant="outlined"
            size="small"
            fullWidth
          />

          <TextField
            required
            name="description"
            id="task-description-input"
            label="Description"
            value={form.description}
            onChange={handleChange}
            variant="outlined"
            size="small"
            fullWidth
            multiline
            rows={4}
          />

          <div>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mb: 1 }}
            >
              Assigned users
            </Typography>

            <Stack direction="row" flexWrap="wrap" gap={1}>
              {form.assignees.map((userId) => {
                const user = members.find((m) => m._id === userId);

                if (!user) return null;

                return (
                  <Chip
                    key={user._id}
                    variant="outlined"
                    onDelete={() => handleRemoveAssignee(user._id)}
                    avatar={
                      <Avatar
                        sx={{
                          width: 24,
                          height: 24,
                          fontSize: "0.7rem",
                        }}
                      >
                        {user.username?.[0]?.toUpperCase() ?? "?"}
                      </Avatar>
                    }
                    label={user.username}
                  />
                );
              })}
            </Stack>
          </div>

          <TextField
            select
            id="task-add-assignee-input"
            label="Add assignee"
            value={assigneePick}
            onChange={(e) => {
              const v = e.target.value;
              if (v) {
                handleAddAssignee(v);
                setAssigneePick("");
              }
            }}
            variant="outlined"
            size="small"
            fullWidth
            disabled={availableMembers.length === 0}
            SelectProps={{ displayEmpty: true }}
          >
            <MenuItem value="">
              <em>
                {availableMembers.length === 0
                  ? "Everyone is assigned"
                  : "Select user"}
              </em>
            </MenuItem>
            {availableMembers.map((member) => (
              <MenuItem key={member._id} value={member._id}>
                {member.username}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            required
            select
            name="type"
            id="task-type-input"
            label="Type"
            value={form.type}
            onChange={handleChange}
            variant="outlined"
            size="small"
            fullWidth
            SelectProps={{ displayEmpty: true }}
          >
            <MenuItem value="">
              <em>Select type</em>
            </MenuItem>

            <MenuItem value="Feature">Feature</MenuItem>

            <MenuItem value="Bug">Bug</MenuItem>

            <MenuItem value="Improvement">Improvement</MenuItem>
          </TextField>

          <TextField
            required
            select
            name="status"
            id="task-status-input"
            label="Status"
            value={form.status}
            onChange={handleChange}
            variant="outlined"
            size="small"
            fullWidth
            SelectProps={{ displayEmpty: true }}
          >
            <MenuItem value="">
              <em>Select status</em>
            </MenuItem>

            <MenuItem value="To Do">To Do</MenuItem>

            <MenuItem value="In Progress">In Progress</MenuItem>

            <MenuItem value="In Review">In Review</MenuItem>

            <MenuItem value="Done">Done</MenuItem>
          </TextField>

          <TextField
            required
            select
            name="priority"
            id="task-priority-input"
            label="Priority"
            value={form.priority}
            onChange={handleChange}
            variant="outlined"
            size="small"
            fullWidth
            SelectProps={{ displayEmpty: true }}
          >
            <MenuItem value="">
              <em>Select priority</em>
            </MenuItem>

            <MenuItem value="None">None</MenuItem>

            <MenuItem value="Low">Low</MenuItem>

            <MenuItem value="Medium">Medium</MenuItem>

            <MenuItem value="High">High</MenuItem>

            <MenuItem value="Urgent">Urgent</MenuItem>
          </TextField>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        {selectedTask && (
          <Button color="error" onClick={handleDelete} sx={{ mr: "auto" }}>
            Delete
          </Button>
        )}

        <Button variant="outlined" onClick={handleClose}>
          Cancel
        </Button>

        <Button variant="contained" onClick={handleSubmit}>
          {selectedTask ? "Save Changes" : "Create"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
