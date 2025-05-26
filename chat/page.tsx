import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '../api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import ChatDashboard from './ChatDashboard';

export default async function ChatPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/');
  }

  const chatrooms = await prisma.chatRoom.findMany({
    where: {
      users: {
        some: {
          id: session.user.id
        }
      }
    },
    include: {
      users: {
        select: {
          id: true,
          name: true,
          image: true,
          email: true,
        }
      }
    }
  });

  return <ChatDashboard chatrooms={chatrooms} user={session.user} />;
} 