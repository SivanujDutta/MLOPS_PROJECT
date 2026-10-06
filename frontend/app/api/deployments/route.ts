import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

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

    const { modelId, endpointSlug } = await req.json();

    if (!modelId || !endpointSlug) {
      return NextResponse.json({ error: 'Model ID and Endpoint Slug are required.' }, { status: 400 });
    }

    // Verify Model Ownership
    const model = await prisma.model.findUnique({
      where: { id: modelId },
      include: {
        experiment: {
          include: { dataset: true }
        }
      }
    });

    if (!model) {
      return NextResponse.json({ error: 'Model not found.' }, { status: 404 });
    }

    if (model.experiment.dataset.userId !== payload.userId) {
      return NextResponse.json({ error: 'You do not have permission to deploy this model.' }, { status: 403 });
    }
    
    // Validate Slug Format
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (!slugRegex.test(endpointSlug)) {
      return NextResponse.json({ error: 'Slug must be lowercase alphanumeric and can contain hyphens.' }, { status: 400 });
    }

    // Check uniqueness
    const existingDeployment = await prisma.deployment.findUnique({
      where: { endpointSlug }
    });

    if (existingDeployment) {
      return NextResponse.json({ error: 'This endpoint slug is already taken.' }, { status: 409 });
    }

    // Create Deployment
    const deployment = await prisma.deployment.create({
      data: {
        modelId,
        endpointSlug,
        status: 'ACTIVE',
      }
    });
    
    // Update model isDeployed flag
    await prisma.model.update({
      where: { id: modelId },
      data: { isDeployed: true }
    });

    return NextResponse.json({ message: 'Deployment created successfully!', deployment }, { status: 201 });

  } catch (error: any) {
    console.error('Create deployment error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
