import "dotenv/config";
import express from "express";
import logger from "morgan";
import cors from "cors";
import authRouter from "./routes/auth-routes.js";
import projectRouter from "./routes/projectRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import agentTasksRoutes from "./routes/agentTasksRoutes.js";

const app = express();

// Restrict CORS to the configured frontend origin(s) in production. Set
// FRONTEND_URL to a comma-separated list of allowed origins (e.g. your Vercel
// URL). When unset, allow all origins so local development still works.
const allowedOrigins = (process.env.FRONTEND_URL || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : true,
  }),
);
// Raise the body limit so base64-encoded PDF uploads (PRD imports) fit.
app.use(express.json({ limit: "25mb" }));
app.use(logger("dev"));
app.use("/api", taskRoutes);
app.use("/api/agent-tasks", agentTasksRoutes);

app.get("/test", (req, res) => {
  res.json({ message: "server is working" });
});

app.use("/api/auth", authRouter);
app.use("/api/projects", projectRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`The express app is ready on port ${PORT}!`);
});

// ZOE: task routes — commented out until task.js model is fixed
// (task.js references undefined commentSchema and uses wrong variable name taskSchema vs issueSchema)
// import issueController from "./controllers/issueController.js";
// app.post("/api/tasks", issueController.createTask);
// app.get("/api/tasks/:projectID", issueController.getTasksByProject);
// app.delete("/api/tasks/:id", issueController.deleteTask);
