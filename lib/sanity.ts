import { createClient } from "@sanity/client";
import imageUrlBuilder from "@sanity/image-url";
import { env } from "./env";

export const sanityClient = createClient({
  projectId: env.SANITY_PROJECT_ID,
  dataset: env.SANITY_DATASET,
  apiVersion: "2024-08-01",
  useCdn: false,
  token: env.SANITY_READ_TOKEN
});

const builder = imageUrlBuilder(sanityClient);

export function urlFor(source: string) {
  return builder.image(source);
}

export async function fetchPublishedCourses() {
  const query = `*[_type == "course"]{..., modules[]->{..., lessons[]->}}`;
  return sanityClient.fetch(query);
}
