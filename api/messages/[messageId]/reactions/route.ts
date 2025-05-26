import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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

    const reaction = await prisma.reaction.create({
      data: {
        emoji,
        userId: session.user.id,
        messageId: params.messageId,
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

    const existingReaction = await prisma.reaction.findFirst({
      where: {
        messageId: params.messageId,
        userId: session.user.id,
        emoji,
      },
    });

    if (!existingReaction) {
      return new NextResponse('Reaction not found', { status: 404 });
    }

    const reaction = await prisma.reaction.delete({
      where: {
        id: existingReaction.id,
      },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Remove reaction error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 