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
          { isGroup: true },
          {
            users: {
              some: {
                id: session.user.id,
              },
            },
          },
        ],
      },
      include: {
        creator: true,
        users: true,
        _count: {
          select: {
            messages: true,
            users: true,
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

  try {
    const body = await request.json();
    const { name, isGroup, targetUserId } = body;

    // Validate required parameters
    if (isGroup === undefined) {
      return NextResponse.json({ 
        error: 'isGroup parameter is required (true for group chat, false for DM)' 
      }, { status: 400 });
    }

    if (isGroup) {
      // Group chat validation
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json({ 
          error: 'Room name is required for group chats' 
        }, { status: 400 });
      }

      try {
    const chatRoom = await prisma.chatRoom.create({
      data: {
            name: name.trim(),
            isGroup: true,
            creator: { connect: { id: session.user.id } },
            users: { connect: { id: session.user.id } },
          },
          include: {
            creator: true,
            users: true,
          },
        });
        return NextResponse.json(chatRoom);
      } catch (dbError) {
        console.error('Database error creating group chat:', dbError);
        return NextResponse.json({ 
          error: 'Failed to create group chat room. Please try again.' 
        }, { status: 500 });
      }
    } else {
      // DM validation
      if (!targetUserId || typeof targetUserId !== 'string') {
        return NextResponse.json({ 
          error: 'targetUserId is required for direct messages' 
        }, { status: 400 });
      }

      try {
        // Check if target user exists
        const targetUser = await prisma.user.findUnique({
          where: { id: targetUserId }
        });

        if (!targetUser) {
          return NextResponse.json({ 
            error: 'Target user not found' 
          }, { status: 404 });
        }

        // Create or find DM room
        const userIds = [session.user.id, targetUserId].sort();
        const dmKey = userIds.join('_');

        let chatRoom = await prisma.chatRoom.findFirst({ 
          where: { dmKey: { equals: dmKey } } 
        });

        if (!chatRoom) {
          chatRoom = await prisma.chatRoom.create({
            data: {
              name: '',
              isGroup: false,
              dmKey,
              creator: { connect: { id: session.user.id } },
              users: { connect: [{ id: session.user.id }, { id: targetUserId }] },
      },
      include: {
              creator: true,
              users: true,
      },
    });
        }
    return NextResponse.json(chatRoom);
      } catch (dbError) {
        console.error('Database error creating/finding DM:', dbError);
        return NextResponse.json({ 
          error: 'Failed to create or find DM room. Please try again.' 
        }, { status: 500 });
      }
    }
  } catch (error) {
    console.error('Error in chat room creation:', error);
    return NextResponse.json({ 
      error: 'Failed to process request. Please try again.' 
    }, { status: 500 });
  }
}