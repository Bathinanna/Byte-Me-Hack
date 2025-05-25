import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { prisma } from '../../../../lib/prisma';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const roomId = searchParams.get('roomId');

    if (!query) {
      return new NextResponse('Query parameter is required', { status: 400 });
    }

    const messages = await prisma.message.findMany({
      where: {
        content: {
          contains: query,
          mode: 'insensitive',
        },
        ...(roomId ? { roomId } : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            emailVerified: true,
            image: true,
          },
        },
        reactions: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                emailVerified: true,
                image: true,
              },
            },
          },
        },
        attachments: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 20,
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Search error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 