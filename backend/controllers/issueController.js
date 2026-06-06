const { supabaseAdmin } = require("../lib/supabase");

const mapUser = (row) => ({
  _id: row.id,
  username: row.username,
  firstName: row.first_name,
  lastName: row.last_name,
  email: row.email,
  role: row.role,
});

const mapTask = (row, userById) => ({
  _id: row.id,
  title: row.title,
  description: row.description,
  type: row.type,
  status: row.status,
  priority: row.priority,
  dueDate: row.due_date,
  project: row.project_id,
  assignees: (row.assignees || []).map((id) => userById.get(id)).filter(Boolean),
  createdBy: row.created_by,
  comment: row.comment || [],
});

const fetchUsersByIds = async (ids) => {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  if (uniqueIds.length === 0) return new Map();

  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id, username, first_name, last_name, email, role")
    .in("id", uniqueIds);

  if (error) {
    throw new Error(error.message);
  }

  return new Map((data || []).map((user) => [user.id, mapUser(user)]));
};

exports.createTask = async (req, res) => {
  try {
    const { data: task, error } = await supabaseAdmin
      .from("tasks")
      .insert({
        title: req.body.title,
        description: req.body.description,
        type: req.body.type,
        status: req.body.status,
        priority: req.body.priority,
        due_date: req.body.dueDate || null,
        project_id: req.body.project,
        assignees: req.body.assignees || [],
        created_by: req.user.userId,
        comment: req.body.comment || [],
      })
      .select("*")
      .single();

    if (error) {
      return res.status(400).json({ message: error.message });
    }

    const userById = await fetchUsersByIds(task.assignees || []);

    return res.status(201).json(mapTask(task, userById));
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

exports.getTasksByProject = async (req, res) => {
  try {
    const { data: tasks, error } = await supabaseAdmin
      .from("tasks")
      .select("*")
      .eq("project_id", req.params.projectId)
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(500).json({ message: error.message });
    }

    const ids = (tasks || []).flatMap((task) => task.assignees || []);
    const userById = await fetchUsersByIds(ids);

    return res.json((tasks || []).map((task) => mapTask(task, userById)));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.deleteTask = async (req, res) => {
  try {
    const { data: task, error: taskError } = await supabaseAdmin
      .from("tasks")
      .select("id, created_by")
      .eq("id", req.params.id)
      .single();

    if (taskError || !task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (task.created_by && task.created_by !== req.user.userId) {
      return res
        .status(403)
        .json({ message: "Only the creator can delete this task" });
    }

    await supabaseAdmin.from("tasks").delete().eq("id", req.params.id);

    return res.json({ message: "Task deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.updateTask = async (req, res) => {
  try {
    const updates = {};
    if (req.body.title !== undefined) updates.title = req.body.title;
    if (req.body.description !== undefined) updates.description = req.body.description;
    if (req.body.type !== undefined) updates.type = req.body.type;
    if (req.body.status !== undefined) updates.status = req.body.status;
    if (req.body.priority !== undefined) updates.priority = req.body.priority;
    if (req.body.dueDate !== undefined) updates.due_date = req.body.dueDate || null;
    if (req.body.assignees !== undefined) updates.assignees = req.body.assignees || [];

    const { data: task, error } = await supabaseAdmin
      .from("tasks")
      .update(updates)
      .eq("id", req.params.id)
      .select("*")
      .single();

    if (error || !task) {
      return res.status(500).json({ message: error?.message || "Task update failed" });
    }

    const userById = await fetchUsersByIds(task.assignees || []);

    return res.json(mapTask(task, userById));
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
