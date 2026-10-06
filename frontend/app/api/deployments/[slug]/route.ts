import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function DELETE(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const id = slug; // The frontend passes the deploymentId in the URL
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const deployment = await prisma.deployment.findUnique({
      where: { id },
      include: { model: { include: { experiment: { include: { dataset: true } } } } }
    });

    if (!deployment) {
      return NextResponse.json({ error: 'Deployment not found' }, { status: 404 });
    }

    if (deployment.model.experiment.dataset.userId !== payload.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Must delete PredictionLogs first due to foreign key constraints
    await prisma.predictionLog.deleteMany({
      where: { deploymentId: id }
    });

    // Delete the Deployment
    await prisma.deployment.delete({
      where: { id }
    });
    
    // Optionally set Model's isDeployed to false if no other deployments exist
    const otherDeployments = await prisma.deployment.count({
      where: { modelId: deployment.modelId }
    });
    
    if (otherDeployments === 0) {
      await prisma.model.update({
        where: { id: deployment.modelId },
        data: { isDeployed: false }
      });
    }

    return NextResponse.json({ message: 'Deployment deleted successfully' }, { status: 200 });
  } catch (error: any) {
    console.error('Delete deployment error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
