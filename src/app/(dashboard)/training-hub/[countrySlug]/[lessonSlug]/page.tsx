'use client'

// app/training-hub/[countrySlug]/[lessonSlug]/page.tsx


import { useParams } from 'next/navigation'
import LessonViewer from '@/components/training/LessonViewer'

export default function LessonViewerPage() {
  const params = useParams()
  const countrySlug = params.countrySlug as string
  const lessonSlug = params.lessonSlug as string

  return <LessonViewer countrySlug={countrySlug} lessonSlug={lessonSlug} />
}