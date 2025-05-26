import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/app/lib/prisma';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      chatRooms: {
        include: {
          users: true,
          messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      },
    },
  });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  const chatrooms = user.chatRooms.map(room => ({
    id: room.id,
    name: room.name,
    isGroup: room.isGroup,
    members: room.users.map(user => ({
      id: user.id,
      name: user.name,
      avatarUrl: user.image,
    })),
    lastMessage: room.messages[0] || null,
  }));
  return NextResponse.json(chatrooms);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { name, isGroup, memberIds } = await request.json();
  if (!name || typeof isGroup !== 'boolean' || !Array.isArray(memberIds)) {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
  }
  const chat = await prisma.chatRoom.create({
    data: {
      name,
      isGroup,
      creatorId: session.user.id,
      users: {
        connect: memberIds.map((id: string) => ({ id })),
      },
    },
    include: {
      users: true,
    },
  });
  return NextResponse.json(chat);
}