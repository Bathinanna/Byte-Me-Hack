import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/app/lib/prisma';
import { authOptions } from '../auth/[...nextauth]/route';

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const chatRooms = await prisma.chatRoom.findMany({
      where: {
        OR: [
          { isPrivate: false },
          {
            members: {
              some: {
                id: session.user.id,
              },
            },
          },
        ],
      },
      include: {
        owner: true,
        members: true,
        _count: {
          select: {
            messages: true,
            members: true,
          },
        },
      },
    });

    return NextResponse.json(chatRooms);
  } catch (error) {
    console.error('Error fetching chat rooms:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chat rooms' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { name } = await request.json();
  if (!name) {
    return NextResponse.json({ error: 'Room name is required' }, { status: 400 });
  }
  try {
    const chatRoom = await prisma.chatRoom.create({
      data: {
        name,
        creator: { connect: { id: session.user.id } },
        users: { connect: { id: session.user.id } },
      },
    });
    return NextResponse.json(chatRoom);
  } catch (error) {
    console.error('Error creating chat room:', error);
    return NextResponse.json({ error: 'Failed to create chat room' }, { status: 500 });
  }
}