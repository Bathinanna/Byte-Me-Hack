import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/app/lib/prisma';
import { authOptions } from '../../../auth/[...nextauth]/route';

export async function POST(request: Request, { params }: { params: { roomId: string } }) {
  console.log(`[API Add Participant] POST request received for roomId: ${params.roomId}`); // Log entry
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    console.log('[API Add Participant] Unauthorized: No session user ID');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  console.log(`[API Add Participant] Session validated for user: ${session.user.id}`);

  const { roomId } = params;
  if (!roomId) {
    console.log('[API Add Participant] Error: Room ID is missing from params');
    return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });
  }
  console.log(`[API Add Participant] Processing for roomId: ${roomId}`);

  let emailToAdd: string;
  try {
    const body = await request.json();
    emailToAdd = body.email;
    console.log(`[API Add Participant] Email to add from body: ${emailToAdd}`);
    if (!emailToAdd || typeof emailToAdd !== 'string') {
      console.log('[API Add Participant] Error: Email is missing or invalid in request body');
      return NextResponse.json({ error: 'Email of the user to add is required' }, { status: 400 });
    }
  } catch (parseError) {
    console.error('[API Add Participant] Error parsing request body:', parseError);
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  try {
    console.log(`[API Add Participant] Looking for user with email: ${emailToAdd}`);
    const userToAdd = await prisma.user.findUnique({
      where: { email: emailToAdd },
    });

    if (!userToAdd) {
      console.log(`[API Add Participant] User not found with email: ${emailToAdd}`);
      return NextResponse.json({ error: 'User with that email not found' }, { status: 404 });
    }
    console.log(`[API Add Participant] Found user to add: ${userToAdd.id}`);

    console.log(`[API Add Participant] Checking if room exists: ${roomId}`);
    const roomExists = await prisma.chatRoom.findUnique({
      where: { id: roomId },
    });

    if (!roomExists) {
      console.log(`[API Add Participant] Room not found: ${roomId}`);
      return NextResponse.json({ error: 'Chat room not found' }, { status: 404 });
    }
    console.log(`[API Add Participant] Room exists: ${roomId}`);

    console.log(`[API Add Participant] Checking if user ${userToAdd.id} is already in room ${roomId}`);
    const isUserAlreadyInRoom = await prisma.chatRoom.findFirst({
      where: {
        id: roomId,
        users: { some: { id: userToAdd.id } },
      },
    });

    if (isUserAlreadyInRoom) {
      console.log(`[API Add Participant] User ${userToAdd.id} is already in room ${roomId}`);
      return NextResponse.json({ message: 'User is already in this room' }, { status: 200 });
    }
    console.log(`[API Add Participant] User ${userToAdd.id} not in room. Proceeding to add.`);

    await prisma.chatRoom.update({
      where: { id: roomId },
      data: {
        users: {
          connect: { id: userToAdd.id },
        },
      },
    });
    console.log(`[API Add Participant] Successfully added user ${userToAdd.id} to room ${roomId}`);

    return NextResponse.json({ message: 'User added to room successfully' });

  } catch (dbError) {
    console.error(`[API Add Participant] Error processing request for room ${roomId}:`, dbError);
    // Type guard for Prisma-like error codes
    if (typeof dbError === 'object' && dbError !== null && 'code' in dbError && (dbError as { code: string }).code === 'P2025') {
        return NextResponse.json({ error: 'Chat room not found or failed to update.' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to add user to room' }, { status: 500 });
  }
} 