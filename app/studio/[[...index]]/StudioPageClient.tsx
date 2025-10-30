'use client'

import {useMemo} from 'react'
import {NextStudio} from 'next-sanity/studio'

import config from '@/sanity.config'
import {projectId} from '@/sanity/env'
import { publicEnv } from '@/lib/env.client'

const DEFAULT_REMOTE_STUDIO_URL = `https://${projectId}.sanity.studio`

function normalizeBasePath(path: string | undefined) {
  if (!path || path === '/') {
    return '/'
  }

  const withLeadingSlash = path.startsWith('/') ? path : `/${path}`

  return withLeadingSlash.replace(/\/+$/, '') || '/'
}

export default function StudioPageClient() {
  const isDevelopment = process.env.NODE_ENV === 'development'
  const remoteStudioUrl =
    publicEnv.NEXT_PUBLIC_SANITY_STUDIO_URL ?? DEFAULT_REMOTE_STUDIO_URL

  const iframeSrc = useMemo(() => {
    try {
      const url = new URL(remoteStudioUrl)

      if (url.pathname === '/' || url.pathname === '') {
        url.pathname = normalizeBasePath(config.basePath)
      }

      url.searchParams.set('embedded', '1')

      return url.toString()
    } catch (error) {
      console.error('Invalid Sanity Studio URL', error)
      return remoteStudioUrl
    }
  }, [remoteStudioUrl])

  if (isDevelopment) {
    return (
      <div className="h-screen w-full overflow-hidden">
        <iframe
          src={iframeSrc}
          className="h-full w-full border-0"
          allow="clipboard-write; clipboard-read; fullscreen"
          title="Sanity Studio"
        />
      </div>
    )
  }

  return <NextStudio config={config} />
}
