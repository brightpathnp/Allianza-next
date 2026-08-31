import type { Metadata } from 'next';

import Login from '@/pages/Login';

export const metadata: Metadata = {
  title: 'Login | Allianza',
  description: 'Sign in to your Allianza account.',
  openGraph: {
    title: 'Login | Allianza',
    description: 'Sign in to your Allianza account.',
  },
};

export default function LoginPage(): React.ReactElement {
  return <Login />;
}