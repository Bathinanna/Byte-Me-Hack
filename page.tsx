import { getServerSession } from 'next-auth';
import { authOptions } from './api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import { RegisterPage } from './components/Auth/RegisterPage';

export default async function Home() {
  const session = await getServerSession(authOptions);

  // If no session exists, show the RegisterPage
  if (!session) {
    return <RegisterPage />;
  }

  // If session exists, redirect to the chat page.
  redirect('/chat');
}