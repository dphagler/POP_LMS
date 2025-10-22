function assertValue<T extends string | undefined>(v: T, msg: string): string {
  if (!v) throw new Error(`Missing environment variable: ${msg}`)
  return v
}

export const apiVersion =
  process.env.NEXT_PUBLIC_SANITY_API_VERSION ??
  process.env.SANITY_STUDIO_API_VERSION ??
  '2025-10-21'

export const dataset = assertValue(
  process.env.NEXT_PUBLIC_SANITY_DATASET ?? process.env.SANITY_STUDIO_DATASET,
  'NEXT_PUBLIC_SANITY_DATASET or SANITY_STUDIO_DATASET'
)

export const projectId = assertValue(
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? process.env.SANITY_STUDIO_PROJECT_ID,
  'NEXT_PUBLIC_SANITY_PROJECT_ID or SANITY_STUDIO_PROJECT_ID'
)
