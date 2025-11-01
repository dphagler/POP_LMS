import { defineArrayMember, defineField, defineType } from "sanity";

export const lesson = defineType({
  name: "lesson",
  title: "Lesson",
  type: "document",
  fields: [
    defineField({
      name: "title",
      type: "string",
      validation: (rule) => rule.required()
    }),
    defineField({ name: "description", type: "text" }),
    defineField({
      name: "module",
      type: "reference",
      to: [{ type: "module" }],
      validation: (rule) => rule.required()
    }),
    defineField({
      name: "published",
      type: "boolean",
      initialValue: true
    }),
    defineField({
      name: "order",
      type: "number",
      initialValue: 0,
      validation: (rule) => rule.integer().min(0)
    }),
    defineField({
      name: "provider",
      type: "string",
      options: {
        list: [
          { title: "YouTube", value: "youtube" },
          { title: "Cloudflare", value: "cloudflare" }
        ]
      },
      initialValue: "youtube"
    }),
    defineField({ name: "videoUrl", type: "url" }),
    defineField({ name: "streamId", type: "string" }),
    defineField({ name: "youtubeId", type: "string", title: "YouTube ID" }),
    defineField({
      name: "durationS",
      type: "number",
      initialValue: 0,
      validation: (rule) => rule.required().min(0)
    }),
    defineField({
      name: "requiresFullWatch",
      type: "boolean",
      initialValue: true
    }),
    defineField({
      name: "assessmentType",
      title: "Assessment Type",
      type: "string",
      initialValue: "QUIZ",
      options: {
        layout: "radio",
        list: [
          { title: "Quiz", value: "QUIZ" },
          { title: "None", value: "NONE" }
        ]
      },
      validation: (rule) => rule.required()
    }),
    defineField({
      name: "objectives",
      title: "Objectives",
      type: "array",
      of: [
        defineArrayMember({
          name: "objective",
          title: "Objective",
          type: "object",
          fields: [
            defineField({
              name: "id",
              title: "Objective ID",
              type: "string",
              validation: (rule) => rule.required()
            }),
            defineField({
              name: "summary",
              title: "Summary",
              type: "text",
              validation: (rule) => rule.required()
            })
          ]
        })
      ]
    }),
    defineField({
      name: "augmentations",
      title: "Augmentations",
      type: "array",
      of: [
        defineArrayMember({
          name: "augmentation",
          title: "Augmentation",
          type: "object",
          fields: [
            defineField({
              name: "targets",
              title: "Targets",
              type: "array",
              of: [defineArrayMember({ type: "string" })],
              validation: (rule) => rule.required().min(1)
            }),
            defineField({
              name: "whenExpr",
              title: "When Expression",
              type: "string"
            }),
            defineField({
              name: "assetRef",
              title: "Asset Reference",
              type: "string",
              validation: (rule) => rule.required()
            })
          ]
        })
      ]
    })
  ]
});
