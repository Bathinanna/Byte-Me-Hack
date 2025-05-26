import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { roomId } = await req.json();
  if (!roomId) {
    return NextResponse.json({ error: 'Missing roomId' }, { status: 400 });
  }
  await prisma.mutedChatRoom.upsert({
    where: { userId_roomId: { userId: session.user.id, roomId } },
    update: {},
    create: { userId: session.user.id, roomId },
  });
  return NextResponse.json({ muted: true });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { roomId } = await req.json();
  if (!roomId) {
    return NextResponse.json({ error: 'Missing roomId' }, { status: 400 });
  }
  await prisma.mutedChatRoom.deleteMany({
    where: { userId: session.user.id, roomId },
  });
  return NextResponse.json({ muted: false });
} 