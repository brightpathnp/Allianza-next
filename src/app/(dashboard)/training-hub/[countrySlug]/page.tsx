// app/training-hub/[countrySlug]/page.tsx
'use client'

import { useParams } from 'next/navigation'
import CountryOverview from '@/components/training/CountryOverview'

export default function CountryOverviewPage() {
  const params = useParams()
  const countrySlug = params.countrySlug as string

  return <CountryOverview countrySlug={countrySlug} />
}