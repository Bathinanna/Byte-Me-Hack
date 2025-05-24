import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '../api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { ChatRoom } from '@/components/Chat/ChatRoom';

export default async function ChatPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/');
  }

  const chatrooms = await prisma.chatRoom.findMany({
    where: {
      participants: {
        some: {
          id: session.user.id
        }
      }
    },
    include: {
      participants: {
        select: {
          id: true,
          name: true,
          image: true,
          email: true,
        }
      }
    }
  });

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Your Chat Rooms</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {chatrooms.map((room) => (
          <div key={room.id} className="border rounded-lg shadow-sm h-[600px]">
            <ChatRoom
              id={room.id}
              name={room.name}
              participants={room.participants}
            />
          </div>
        ))}
      </div>
    </div>
  );
} 