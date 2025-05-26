import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '../api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import ChatDashboard from '../components/ChatDashboard';

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

  const fixedChatrooms = chatrooms.map(room => ({
    ...room,
    users: room.users.map(u => ({
      ...u,
      name: u.name ?? '',
      image: u.image ?? '',
      email: u.email ?? '',
    })),
  }));

  return <ChatDashboard chatrooms={fixedChatrooms} user={{ ...session.user, name: session.user.name ?? '', image: session.user.image ?? '', email: session.user.email ?? '' }} />;
}