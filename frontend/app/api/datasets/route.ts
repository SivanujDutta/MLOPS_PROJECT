import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET(req: Request) {
  try {
    // 1. Authenticate the user
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = payload.userId;

    // 2. Fetch the datasets from Postgres, ordered by most recently created
    const datasets = await prisma.dataset.findMany({
      where: {
        userId: userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      // Optionally, you can include the experiments associated with each dataset
      // if you want to display their statuses on the dashboard!
      include: {
        experiments: {
          select: {
            id: true,
            status: true,
            taskType: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          }
        }
      }
    });

    return NextResponse.json({ datasets }, { status: 200 });

  } catch (error) {
    console.error('Fetch datasets error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
