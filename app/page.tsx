import { getServerSession } from 'next-auth';
import { authOptions } from './api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import { LoginPage } from '@/components/Auth/LoginPage';

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return <LoginPage />;
  }

  redirect('/chat');
} 