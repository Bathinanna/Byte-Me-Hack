import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
  const { token, password } = await req.json();

  if (!token || !password) {
      return NextResponse.json({ message: 'Token and password are required' }, { status: 400 });
  }

    // Find user with valid reset token
  const user = await prisma.user.findFirst({
    where: {
      resetToken: token,
        resetTokenExpiry: {
          gt: new Date(), // Check if token hasn't expired
        },
    },
  });

  if (!user) {
      return NextResponse.json({ message: 'Invalid or expired reset token' }, { status: 400 });
  }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user's password and clear reset token
  await prisma.user.update({
    where: { id: user.id },
    data: {
        password: hashedPassword,
      resetToken: null,
      resetTokenExpiry: null,
    },
  });

    return NextResponse.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
} 