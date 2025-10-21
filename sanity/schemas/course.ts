import { defineArrayMember, defineField, defineType } from "sanity";

export const course = defineType({
  name: "course",
  title: "Course",
  type: "document",
  fields: [
    defineField({ name: "title", type: "string", validation: (rule) => rule.required() }),
    defineField({ name: "description", type: "text" }),
    defineField({
      name: "modules",
      type: "array",
      of: [defineArrayMember({ type: "reference", to: [{ type: "module" }] })]
    })
  ]
});
