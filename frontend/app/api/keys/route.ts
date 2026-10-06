import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import crypto from 'crypto';

function generateApiKey() {
  return `sk_live_${crypto.randomBytes(24).toString('hex')}`;
}

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const apiKeys = await prisma.apiKey.findMany({
      where: { userId: payload.userId },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(apiKeys, { status: 200 });
  } catch (error: any) {
    console.error('Fetch API keys error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await req.json();
    const name = body.name || 'Default Key';

    const newKey = generateApiKey();

    const apiKey = await prisma.apiKey.create({
      data: {
        name,
        key: newKey,
        userId: payload.userId
      }
    });

    return NextResponse.json(apiKey, { status: 201 });
  } catch (error: any) {
    console.error('Create API key error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
