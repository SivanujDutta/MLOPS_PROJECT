import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendVerificationEmail } from '@/lib/email';
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
      // Return 200 even if user not found to prevent email enumeration
      return NextResponse.json({ message: 'If that email exists, a verification link has been sent.' }, { status: 200 });
    }

    if (user.isEmailVerified) {
      return NextResponse.json({ error: 'Email is already verified' }, { status: 400 });
    }

    // Generate a secure random token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Update the database
    await prisma.user.update({
      where: { email },
      data: {
        verifyEmailToken: token,
        verifyEmailTokenExpiry: tokenExpiry,
      },
    });

    // Send the email
    await sendVerificationEmail(email, token);

    return NextResponse.json({ message: 'If that email exists, a verification link has been sent.' }, { status: 200 });
  } catch (error) {
    console.error('Verify Email Send Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
