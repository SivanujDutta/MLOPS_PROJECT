import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

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

    const recentExperiments = await prisma.experiment.findMany({
      where: {
        dataset: { userId: payload.userId },
        status: { in: ['COMPLETED', 'FAILED'] }
      },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      include: {
        dataset: { select: { name: true } }
      }
    });

    const notifications = recentExperiments.map(exp => ({
      id: exp.id,
      title: `Model Training ${exp.status === 'COMPLETED' ? 'Finished' : 'Failed'}`,
      message: `Training for ${exp.taskType} on ${exp.dataset.name} has ${exp.status.toLowerCase()}.`,
      status: exp.status,
      timestamp: exp.updatedAt
    }));

    return NextResponse.json(notifications, { status: 200 });
  } catch (error: any) {
    console.error('Fetch notifications error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
