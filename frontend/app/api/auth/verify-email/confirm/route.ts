import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    // Find the user with this token
    const user = await prisma.user.findFirst({
      where: { verifyEmailToken: token },
    });

    if (!user) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
    }

    // Check if the token has expired
    if (!user.verifyEmailTokenExpiry || user.verifyEmailTokenExpiry < new Date()) {
      return NextResponse.json({ error: 'Token has expired' }, { status: 400 });
    }

    // Update user to verified and clear tokens
    await prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        verifyEmailToken: null,
        verifyEmailTokenExpiry: null,
      },
    });

    return NextResponse.json({ message: 'Email verified successfully' }, { status: 200 });
  } catch (error) {
    console.error('Verify Email Confirm Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
