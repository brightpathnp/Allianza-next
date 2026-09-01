import type { Metadata } from 'next';

import UniversitySignUp from '@/pages/UniversitySignUp';

export const metadata: Metadata = {
  title: 'University Registration | Allianza',
  description: 'Register your university with Allianza.',
  openGraph: {
    title: 'University Registration | Allianza',
    description: 'Register your university with Allianza.',
  },
};

export default function UniversitySignUpPage(): React.ReactElement {
  return <UniversitySignUp />;
}