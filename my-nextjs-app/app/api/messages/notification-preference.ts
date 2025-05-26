import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const roomId = searchParams.get('roomId');
  if (!roomId) {
    return NextResponse.json({ error: 'Missing roomId' }, { status: 400 });
  }
  const pref = await prisma.notificationPreference.findUnique({
    where: { userId_roomId: { userId: session.user.id, roomId } },
  });
  return NextResponse.json({ preference: pref?.preference || 'all' });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { roomId, preference } = await req.json();
  if (!roomId || !['all', 'mentions', 'none'].includes(preference)) {
    return NextResponse.json({ error: 'Missing or invalid roomId or preference' }, { status: 400 });
  }
  await prisma.notificationPreference.upsert({
    where: { userId_roomId: { userId: session.user.id, roomId } },
    update: { preference },
    create: { userId: session.user.id, roomId, preference },
  });
  return NextResponse.json({ success: true });
} 