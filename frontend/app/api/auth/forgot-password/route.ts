import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendPasswordResetEmail } from '@/lib/email';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
     
      return NextResponse.json({ message: 'If that email exists, a password reset link has been sent.' }, { status: 200 });
    }

    
    const token = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Update the database
    await prisma.user.update({
      where: { email },
      data: {
        forgotPasswordToken: token,
        forgotPasswordTokenExpiry: tokenExpiry,
      },
    });

    await sendPasswordResetEmail(email, token);

    return NextResponse.json({ message: 'If that email exists, a password reset link has been sent.' }, { status: 200 });
  } catch (error) {
    console.error('Forgot Password Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
