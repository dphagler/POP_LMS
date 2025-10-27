import type { StructureResolver } from "sanity/desk";

// https://www.sanity.io/docs/structure-builder-cheat-sheet
const structure: StructureResolver = (S) =>
  S.list()
    .title("Content")
    .items([
      S.documentTypeListItem("course"),
      S.documentTypeListItem("module"),
      S.documentTypeListItem("lesson"),
    ]);

export default structure;