import { defineField, defineType } from "sanity";

export const lesson = defineType({
  name: "lesson",
  title: "Lesson",
  type: "document",
  fields: [
    defineField({ name: "title", type: "string", validation: (rule) => rule.required() }),
    defineField({ name: "description", type: "text" }),
    defineField({ name: "order", type: "number", initialValue: 0, validation: (rule) => rule.integer().min(0) }),
    defineField({ name: "youtubeId", type: "string", validation: (rule) => rule.required() }),
    defineField({ name: "durationS", type: "number", validation: (rule) => rule.required().positive() }),
    defineField({ name: "requiresFullWatch", type: "boolean", initialValue: true })
  ]
});
