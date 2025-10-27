import { type SchemaTypeDefinition } from "sanity";

import { course } from "../schemas/course";
import { lesson } from "../schemas/lesson";
import { courseModule } from "../schemas/module";

export const schemaTypes: SchemaTypeDefinition[] = [course, courseModule, lesson];
