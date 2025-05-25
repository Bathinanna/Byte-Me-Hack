import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/app/lib/prisma';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function GET(request: Request, { params }: { params: { roomId: string } }) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const chatRoom = await prisma.chatRoom.findUnique({
      where: { id: params.roomId },
      include: {
        creator: true,
        users: true,
        messages: {
          include: {
            user: true,
            reactions: true,
          },
          orderBy: {
            createdAt: 'asc',
          }
        },
      },
    });

    if (!chatRoom) {
      return NextResponse.json({ error: 'Chat room not found' }, { status: 404 });
    }

    return NextResponse.json(chatRoom);
  } catch (error) {
    console.error('Error fetching chat room:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chat room' },
      { status: 500 }
    );
  }
}