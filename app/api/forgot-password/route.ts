import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/mailer";
import crypto from "crypto";

export async function POST(req: Request) {
  const { email } = await req.json();
  if (!email) {
    return NextResponse.json({ message: "Email is required" }, { status: 400 });
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }
  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetTokenExpiry = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour
  await prisma.user.update({
    where: { email },
    data: { resetToken, resetTokenExpiry },
  });
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}`;
  await sendEmail({
    to: email,
    subject: "Reset Your Password for Byte-Me-Hack",
    text: `Click the link to reset your password: ${resetUrl}`,
    html: `<h2>Reset Your Password</h2><p>Click <a href="${resetUrl}">here</a> to reset your password.</p>`,
  });
  return NextResponse.json({ message: "Password reset link sent to your email" });
} 