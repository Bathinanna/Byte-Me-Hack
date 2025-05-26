import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { roomId, userId } = await req.json();
  if (!roomId || !userId) {
    return NextResponse.json({ error: 'Missing roomId or userId' }, { status: 400 });
  }
  // Only allow if current user is admin or creator
  const isAdmin = await prisma.chatRoomAdmin.findUnique({
    where: { userId_roomId: { userId: session.user.id, roomId } },
  });
  const room = await prisma.chatRoom.findUnique({ where: { id: roomId } });
  if (!isAdmin && room?.creatorId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  await prisma.chatRoomAdmin.upsert({
    where: { userId_roomId: { userId, roomId } },
    update: {},
    create: { userId, roomId },
  });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { roomId, userId } = await req.json();
  if (!roomId || !userId) {
    return NextResponse.json({ error: 'Missing roomId or userId' }, { status: 400 });
  }
  // Only allow if current user is admin or creator
  const isAdmin = await prisma.chatRoomAdmin.findUnique({
    where: { userId_roomId: { userId: session.user.id, roomId } },
  });
  const room = await prisma.chatRoom.findUnique({ where: { id: roomId } });
  if (!isAdmin && room?.creatorId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  await prisma.chatRoomAdmin.deleteMany({
    where: { userId, roomId },
  });
  return NextResponse.json({ success: true });
} 