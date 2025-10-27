import {NextStudio} from 'next-sanity/studio'

import config from '@/sanity.config'

export const metadata = {
  title: 'Sanity Studio',
}

export const revalidate = 0

export default function StudioPage() {
  return <NextStudio config={config} />
}
