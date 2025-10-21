import { defineArrayMember, defineField, defineType } from "sanity";

export const module = defineType({
  name: "module",
  title: "Module",
  type: "document",
  fields: [
    defineField({ name: "title", type: "string", validation: (rule) => rule.required() }),
    defineField({ name: "order", type: "number", initialValue: 0 }),
    defineField({
      name: "lessons",
      type: "array",
      of: [defineArrayMember({ type: "reference", to: [{ type: "lesson" }] })]
    })
  ]
});
