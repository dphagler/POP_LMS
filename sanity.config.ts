// sanity.config.ts
import { defineConfig } from "sanity";
import { deskTool } from "sanity/desk";

// If your repo already exports these, great:
import { projectId, dataset } from "./sanity/env"; // <- you have this file
import { types } from "./sanity/schema";
import structure from "./sanity/structure"; // <- optional custom Desk

export default defineConfig({
  name: "pop-lms-studio",
  title: "POP LMS Studio",
  apiVersion: "2024-10-01",
  projectId,
  dataset,
  basePath: "/studio", // where Studio will live if you embed it later
  plugins: [
    deskTool({ structure })
    // add other plugins here (e.g. vision) if you want
  ],
  schema: {
    types
  }
});
