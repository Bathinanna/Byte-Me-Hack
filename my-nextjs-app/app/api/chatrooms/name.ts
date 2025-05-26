import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { roomId, newName } = await req.json();
  if (!roomId || !newName) {
    return NextResponse.json({ error: 'Missing roomId or newName' }, { status: 400 });
  }
  // Only allow if current user is admin or creator
  const isAdmin = await prisma.chatRoomAdmin.findUnique({
    where: { userId_roomId: { userId: session.user.id, roomId } },
  });
  const room = await prisma.chatRoom.findUnique({ where: { id: roomId } });
  if (!isAdmin && room?.creatorId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  await prisma.chatRoom.update({
    where: { id: roomId },
    data: { name: newName },
  });
  return NextResponse.json({ success: true });
} 