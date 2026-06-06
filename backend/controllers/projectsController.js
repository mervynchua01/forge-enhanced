const { supabaseAdmin } = require("../lib/supabase");

const mapUser = (row) => ({
  _id: row.id,
  username: row.username,
  firstName: row.first_name,
  lastName: row.last_name,
  email: row.email,
  role: row.role,
});

const mapProject = (row, userById) => ({
  _id: row.id,
  projectTitle: row.project_title,
  projectKey: row.project_key,
  description: row.description,
  projectLead: row.project_lead ? userById.get(row.project_lead) : null,
  members: (row.members || []).map((id) => userById.get(id)).filter(Boolean),
  targetDate: row.target_date,
  status: row.status,
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

const createProject = async (req, res) => {
  const {
    projectTitle,
    projectKey,
    description,
    members,
    targetDate,
    status,
  } = req.body;

  try {
    if (
      !projectTitle ||
      !projectKey ||
      !description ||
      !targetDate ||
      !status
    ) {
      return res.status(400).json({ message: "Missing required project info" });
    }

    const { data: project, error } = await supabaseAdmin
      .from("projects")
      .insert({
        project_title: projectTitle,
        project_key: projectKey,
        description,
        project_lead: req.user.userId,
        members: members || [],
        target_date: targetDate,
        status,
      })
      .select("*")
      .single();

    if (error) {
      if (error.code === "23505") {
        return res.status(400).json({
          message: "Project Title or Key already exists.",
          duplicate: error.details || null,
        });
      }
      return res.status(500).json({ err: error.message });
    }

    const userById = await fetchUsersByIds([
      project.project_lead,
      ...(project.members || []),
    ]);

    return res.status(201).json({
      message: "Project created successfully",
      project: mapProject(project, userById),
    });
  } catch (err) {
    return res.status(500).json({ err: err.message });
  }
};

const getAllProjects = async (req, res) => {
  try {
    const { data: projects, error } = await supabaseAdmin
      .from("projects")
      .select("*");

    if (error) {
      return res.status(500).json({ err: error.message });
    }

    const ids = (projects || []).flatMap((project) => [
      project.project_lead,
      ...(project.members || []),
    ]);
    const userById = await fetchUsersByIds(ids);

    return res.status(200).json({
      projects: (projects || []).map((project) => mapProject(project, userById)),
    });
  } catch (err) {
    return res.status(500).json({ err: err.message });
  }
};

const getProjects = async (req, res) => {
  try {
    const userId = req.user.userId;

    const { data: projects, error } = await supabaseAdmin
      .from("projects")
      .select("*")
      .or(`project_lead.eq.${userId},members.cs.{${userId}}`);

    if (error) {
      return res.status(500).json({ err: error.message });
    }

    const ids = (projects || []).flatMap((project) => [
      project.project_lead,
      ...(project.members || []),
    ]);
    const userById = await fetchUsersByIds(ids);

    return res.status(200).json({
      projects: (projects || []).map((project) => mapProject(project, userById)),
    });
  } catch (err) {
    return res.status(500).json({ err: err.message });
  }
};

const getProjectById = async (req, res) => {
  try {
    const projectId = req.params.projectId;

    const { data: project, error } = await supabaseAdmin
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (error || !project) {
      return res.status(404).json({ message: "Project not found." });
    }

    const userById = await fetchUsersByIds([
      project.project_lead,
      ...(project.members || []),
    ]);

    return res.status(200).json({
      project: mapProject(project, userById),
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const queryProject = async (req, res) => {
  try {
    const { search } = req.query;
    if (!search) {
      return res.status(200).json({ project: [] });
    }

    const { data: projects, error } = await supabaseAdmin
      .from("projects")
      .select("*")
      .or(`project_title.ilike.%${search}%,project_key.ilike.%${search}%`);

    if (error) {
      return res.status(500).json({ message: error.message });
    }

    const ids = (projects || []).flatMap((project) => [
      project.project_lead,
      ...(project.members || []),
    ]);
    const userById = await fetchUsersByIds(ids);

    return res.status(200).json({
      project: (projects || []).map((project) => mapProject(project, userById)),
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const queryUser = async (req, res) => {
  try {
    const { search } = req.query;
    if (!search) {
      return res.status(200).json([]);
    }

    const { data: users, error } = await supabaseAdmin
      .from("users")
      .select("id, username, first_name, last_name, email, role")
      .or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%`)
      .limit(10);

    if (error) {
      return res.status(500).json({ message: error.message });
    }

    return res.status(200).json((users || []).map(mapUser));
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const editProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { projectTitle, projectKey, description, members, targetDate, status } =
      req.body;

    const memberIds = members ? members.map((m) => m._id || m) : undefined;

    const updates = {};
    if (projectTitle !== undefined) updates.project_title = projectTitle;
    if (projectKey !== undefined) updates.project_key = projectKey;
    if (description !== undefined) updates.description = description;
    if (memberIds !== undefined) updates.members = memberIds;
    if (targetDate !== undefined) updates.target_date = targetDate;
    if (status !== undefined) updates.status = status;

    const { data: project, error } = await supabaseAdmin
      .from("projects")
      .update(updates)
      .eq("id", projectId)
      .select("*")
      .single();

    if (error || !project) {
      return res.status(404).json({ message: "Project not found." });
    }

    const userById = await fetchUsersByIds([
      project.project_lead,
      ...(project.members || []),
    ]);

    return res.json({
      message: "Project updated.",
      project: mapProject(project, userById),
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const deleteProject = async (req, res) => {
  try {
    const projectId = req.params.projectId;
    const { data, error } = await supabaseAdmin
      .from("projects")
      .delete()
      .eq("id", projectId)
      .select("id")
      .single();

    if (error || !data) {
      return res.status(404).json({ message: "Project not found." });
    }

    return res.status(200).send({ message: "Project deleted!" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const getProjectProgress = async (req, res) => {
  const { projectId } = req.params;
  try {
    const { data: tasks, error } = await supabaseAdmin
      .from("tasks")
      .select("status")
      .eq("project_id", projectId);

    if (error) {
      return res.status(500).json({ message: error.message });
    }

    const totalTasks = (tasks || []).length;
    const completedTasks = (tasks || []).filter((t) => t.status === "Done").length;

    return res.status(200).json({
      completed: completedTasks,
      total: totalTasks,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const getProjectMembers = async (req, res) => {
  try {
    const { data: project, error } = await supabaseAdmin
      .from("projects")
      .select("project_lead, members")
      .eq("id", req.params.projectId)
      .single();

    if (error || !project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const ids = [project.project_lead, ...(project.members || [])];
    const userById = await fetchUsersByIds(ids);

    const allMembers = ids.map((id) => userById.get(id)).filter(Boolean);

    const uniqueMembers = allMembers.filter(
      (member, index, self) =>
        index === self.findIndex((m) => m._id === member._id),
    );

    return res.json(uniqueMembers);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

module.exports = {
  createProject,
  getAllProjects,
  getProjectById,
  editProject,
  deleteProject,
  queryProject,
  queryUser,
  getProjects,
  getProjectProgress,
  getProjectMembers,
};
