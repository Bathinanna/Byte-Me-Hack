import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/app/lib/prisma';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const chatRoomId = searchParams.get('chatRoomId');
  const cursor = searchParams.get('cursor');
  const limit = 50;

  if (!chatRoomId) {
    return NextResponse.json({ error: 'chatRoomId is required' }, { status: 400 });
  }

    const messages = await prisma.message.findMany({
    where: { roomId: chatRoomId },
      take: limit,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
    orderBy: { createdAt: 'desc' },
      include: {
      user: { select: { id: true, name: true, image: true } },
      reactions: { include: { user: true } },
      replies: true,
      readBy: true,
      },
    });

    const nextCursor = messages.length === limit ? messages[limit - 1].id : null;

    return NextResponse.json({
      messages: messages.reverse(),
      nextCursor,
    });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { roomId, content, parentMessageId, type, fileUrl } = await request.json();
  if (!roomId || (!content && !fileUrl)) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const message = await prisma.message.create({
      data: {
        roomId: roomId,
        userId: user.id,
        content,
        parentMessageId,
      },
      include: {
        user: { select: { id: true, name: true, image: true } },
        reactions: true,
        replies: true,
        readBy: true,
      },
    });

    return NextResponse.json(message);
}