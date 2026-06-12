//Run to create dummy data in MongoDB

import "dotenv/config";
import mongoose from "mongoose";
import User from "./models/user.js";
import Project from "./models/project.js";
import Task from "./models/task.js";
import { faker } from "@faker-js/faker";
import bcrypt from "bcrypt";

const connect = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log(`Connected to MongoDB ${mongoose.connection.name}`);
  await runQueries();

  await mongoose.disconnect();
  console.log("Disconnected from MongoDB");
  process.exit();
};

connect();

const runQueries = async () => {
  //Clear Database
  await User.deleteMany({});
  await Project.deleteMany({});
  await Task.deleteMany({});

  //Create User
  const firstName = [
    "Mervyn",
    "Zoe",
    "MeiLeng",
    "Fay",
    "Hans",
    "Michael",
    "Nils",
    "Colin",
    "Brennan",
    "Tobias",
  ];
  const lastName = [
    "Chua",
    "Tan",
    "Tan",
    "Hartmann",
    "Heismann",
    "Berg",
    "Breithom",
    "Gan",
    "Khor",
    "Holger",
  ];
  const roles = [
    "admin",
    "admin",
    "admin",
    "user",
    "user",
    "user",
    "user",
    "admin",
    "user",
    "user",
  ];
  const hashedPassword = await bcrypt.hash("123456", 12);
  const users = await User.insertMany(
    Array.from({ length: 10 }).map((_, i) => ({
      username: `${firstName[i]}_${lastName[i]}`,
      firstName: firstName[i],
      lastName: lastName[i],
      email: `${firstName[i]}@email.com`,
      password: hashedPassword,
      role: roles[i],
    })),
  );

  //Create Projects
  const admins = users.filter((u) => u.role === "admin");
  const mUsers = users.filter((u) => u.role === "user");
  const projectName = [
    "Urban Green Initiative",
    "Operation Data Stream",
    "The Zenith Interface",
    "Knowledge Bridge",
    "Eco-Print Audit",
    "Launchpad Mentorship",
  ];
  const projectKey = [
    "UG",
    "OPDATA",
    "ZENITH",
    "Knowledge",
    "ecoprint",
    "mentor",
  ];
  const description = [
    "Transform unused community spaces into functional micro-gardens.",
    "Automate the collection and visualization of monthly performance metrics.",
    "Revamp the user experience of the mobile application for accessibility and speed.",
    "Build an internal company wiki to centralize documentation and onboarding materials.",
    "Reduce the carbon footprint and material waste of the office workflow.",
    "Create a structured mentorship program pairing senior staff with new hires.",
  ];
  const projectStatus = ["To Do", "In Progress", "In Review", "Completed"];
  const projects = await Project.insertMany(
    Array.from({ length: 6 }).map((_, i) => {
      const lead = faker.helpers.arrayElement(admins);

      return {
        projectTitle: projectName[i],
        projectKey: projectKey[i].toUpperCase(),
        description: description[i],
        projectLead: lead._id,
        members: faker.helpers
          .arrayElements(mUsers, { min: 1, max: 5 })
          .map((user) => user._id),
        targetDate: faker.date.future(),
        status: faker.helpers.arrayElement(projectStatus),
      };
    }),
  );
  //Create Tasks
  const taskTemplates = [
    [
      "Conduct a site assessment of three potential locations to evaluate sunlight and soil quality.",
      "Draft a proposal outlining the budget, native plant species, and maintenance schedule.",
      "Organize a community outreach meeting to recruit local volunteers.",
    ],
    [
      "Identify and map all required data sources (APIs, spreadsheets, CRM).",
      "Set up a centralized data warehouse or dashboarding tool (e.g., Looker, Power BI).",
      "Create an automated weekly report template for stakeholders.",
    ],
    [
      "Conduct a UX audit to identify current friction points and accessibility blockers.",
      "Sketch wireframes for the new navigation flow and primary screen layouts.",
    ],
    [
      "Audit existing documents to determine what needs to be updated, archived, or created.",
      "Choose and set up a platform (e.g., Notion, Confluence, Obsidian).",
      "Establish a Knowledge Governance policy for team updates and reviews.",
    ],
    [
      "Gather data on annual paper, ink, and electricity consumption.",
      "Survey employees regarding their current printing habits and remote work needs.",
      "Implement a digital-first policy and configure printers for default duplex printing.",
    ],
    [
      "Define clear program objectives and success metrics (retention, time-to-productivity).",
      "Develop a matching algorithm or process based on skills and career interests.",
      "Create a 12-week curriculum framework for mentorship pairs to follow.",
      "Review framework.",
    ],
  ];
  const tasks = [];
  let projIdx = 0;
  for (const project of projects) {
    const potentialAssignees = [project.projectLead, ...project.members];
    const currentProjectTasks = taskTemplates[projIdx];

    for (let i = 0; i < currentProjectTasks.length; i++) {
      tasks.push({
        title: `${project.projectKey}- Task ${i + 1}`,
        description: currentProjectTasks[i],
        type: faker.helpers.arrayElement(["Bug", "Feature", "Improvement"]),
        project: project._id,
        assignee: faker.helpers.arrayElement(potentialAssignees),
        createdBy: faker.helpers.arrayElement(potentialAssignees),
        status: faker.helpers.arrayElement([
          "To Do",
          "In Progress",
          "In Review",
          "Done",
        ]),
        priority: faker.helpers.arrayElement([
          "None",
          "Low",
          "Medium",
          "High",
          "Urgent",
        ]),
        dueDate: faker.date.between({
          from: new Date(),
          to: project.targetDate,
        }),
      });
    }
    projIdx++;
  }

  await Task.insertMany(tasks);
};
