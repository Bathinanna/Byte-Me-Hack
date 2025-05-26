import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/app/lib/prisma';
import { authOptions } from '../auth/[...nextauth]/route';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const chatRoomId = searchParams.get('chatRoomId');
  console.log(`[API/MESSAGES] GET request for chatRoomId: ${chatRoomId}`);
  const cursor = searchParams.get('cursor');
  const limit = 50;

  if (!chatRoomId) {
    return NextResponse.json(
      { error: 'Chat room ID is required' },
      { status: 400 }
    );
  }

  try {
    const messages = await prisma.message.findMany({
      where: {
        roomId: chatRoomId,
      },
      take: limit,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        user: true,
        reactions: {
          include: {
            user: true,
          },
        },
        replies: {
          include: {
            user: true,
          },
        },
      },
    });

    const nextCursor = messages.length === limit ? messages[limit - 1].id : null;

    return NextResponse.json({
      messages: messages.reverse(),
      nextCursor,
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();
  const content = formData.get('content') as string;
  const roomId = formData.get('roomId') as string;
  const parentMessageId = formData.get('parentMessageId') as string | null;
  // ... handle attachments ...

  if (!content || !roomId) {
    return NextResponse.json({ error: 'Content and roomId are required' }, { status: 400 });
  }

  try {
    const message = await prisma.message.create({
      data: {
        content,
        userId: session.user.id,
        roomId,
        parentMessageId: parentMessageId || undefined,
      },
      include: {
        user: true,
      },
    });
    return NextResponse.json(message);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}