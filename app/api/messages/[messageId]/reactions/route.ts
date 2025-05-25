import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(
  request: Request,
  { params }: { params: { messageId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { emoji } = await request.json();
    if (!emoji) {
      return new NextResponse('Emoji is required', { status: 400 });
    }

    const reaction = await prisma.messageReaction.create({
      data: {
        emoji,
        messageId: params.messageId,
        userId: session.user.id,
      },
    });

    return NextResponse.json(reaction);
  } catch (error) {
    console.error('Add reaction error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { messageId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const emoji = searchParams.get('emoji');
    if (!emoji) {
      return new NextResponse('Emoji is required', { status: 400 });
    }

    await prisma.messageReaction.deleteMany({
      where: {
        messageId: params.messageId,
        userId: session.user.id,
        emoji,
      },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Remove reaction error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 