import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { token, newPassword } = await req.json();

    if (!token || !newPassword) {
      return NextResponse.json({ error: 'Token and new password are required' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long' }, { status: 400 });
    }

    // Find the user with this token
    const user = await prisma.user.findFirst({
      where: { forgotPasswordToken: token },
    });

    if (!user) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
    }

    // Check if the token has expired
    if (!user.forgotPasswordTokenExpiry || user.forgotPasswordTokenExpiry < new Date()) {
      return NextResponse.json({ error: 'Token has expired' }, { status: 400 });
    }

    // Hash the new password
    const passwordHash = await hashPassword(newPassword);

    // Update user's password and clear tokens
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        forgotPasswordToken: null,
        forgotPasswordTokenExpiry: null,
      },
    });

    return NextResponse.json({ message: 'Password has been reset successfully' }, { status: 200 });
  } catch (error) {
    console.error('Reset Password Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
