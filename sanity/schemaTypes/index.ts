import { type SchemaTypeDefinition } from "sanity";

import { course } from "../schemas/course";
import { lesson } from "../schemas/lesson";
import { module } from "../schemas/module";

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [course, module, lesson]
};
