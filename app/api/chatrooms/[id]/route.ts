import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '../../auth/[...nextauth]/route';

// Get specific chatroom
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const chatroom = await prisma.chatRoom.findUnique({
    where: { id: params.id },
    include: {
      participants: {
        select: {
          id: true,
          name: true,
          image: true,
        }
      },
      messages: {
        take: 50,
        orderBy: { createdAt: 'desc' },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              image: true,
            }
          }
        }
      }
    }
  });

  if (!chatroom) {
    return NextResponse.json({ error: 'Chatroom not found' }, { status: 404 });
  }

  return NextResponse.json(chatroom);
}

// Update chatroom
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const json = await request.json();
    const { name, description } = json;

    const chatroom = await prisma.chatRoom.update({
      where: { id: params.id },
      data: { name, description },
    });

    return NextResponse.json(chatroom);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update chatroom' }, { status: 500 });
  }
}

// Delete chatroom
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await prisma.chatRoom.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ message: 'Chatroom deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete chatroom' }, { status: 500 });
  }
} 