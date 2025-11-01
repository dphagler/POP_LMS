import { defineArrayMember, defineField, defineType } from "sanity";

export const courseModule = defineType({
  name: "module",
  title: "Module",
  type: "document",
  fields: [
    defineField({
      name: "title",
      type: "string",
      validation: (rule) => rule.required()
    }),
    defineField({ name: "description", type: "text" }),
    defineField({
      name: "slug",
      type: "slug",
      options: { source: "title" },
      validation: (rule) => rule.required()
    }),
    defineField({ name: "order", type: "number", initialValue: 0 }),
    defineField({ name: "published", type: "boolean", initialValue: true }),
    defineField({
      name: "course",
      type: "reference",
      to: [{ type: "course" }],
      validation: (rule) => rule.required()
    }),
    defineField({
      name: "lessons",
      type: "array",
      of: [defineArrayMember({ type: "reference", to: [{ type: "lesson" }] })]
    })
  ]
});
