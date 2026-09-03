// app/training-hub/institution/edit/[trainingId]/page.tsx
'use client'

import { useParams } from 'next/navigation'
import InstitutionTrainingFormPage from '@/components/training/InstitutionTrainingFormPage'

export default function EditInstitutionFormPage() {
  const params = useParams()
  const trainingId = params.trainingId as string

  return <InstitutionTrainingFormPage mode="edit" trainingId={trainingId} />
}