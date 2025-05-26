import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const roomId = searchParams.get('roomId');
  const keyword = searchParams.get('keyword');

  if (!roomId || !keyword) {
    return NextResponse.json({ error: 'Missing roomId or keyword' }, { status: 400 });
  }

  const messages = await prisma.message.findMany({
    where: {
      roomId,
      content: {
        contains: keyword,
        mode: 'insensitive',
      },
    },
    orderBy: { createdAt: 'asc' },
    include: {
      user: {
        select: { id: true, name: true, image: true },
      },
    },
  });

  return NextResponse.json(messages);
} 