import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    projectTitle: {
      type: String,
      required: [true, "Project name is required."],
      unique: true,
    },
    projectKey: {
      type: String,
      required: true,
      unique: [true, "Project key must be unique."],
      uppercase: true,
    },
    description: {
      type: String,
      required: true,
    },
    projectLead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    ],
    targetDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: ["To Do", "In Progress", "In Review", "Completed"],
      default: "To Do",
    },
  },
  {
    timestamps: true,
  },
);

const Project = mongoose.model("Project", projectSchema);

export default Project;
