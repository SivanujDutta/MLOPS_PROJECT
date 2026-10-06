import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    
    // 1. Authenticate User (via API Key or Cookie)
    let authenticatedUserId: string | null = null;
    const authHeader = req.headers.get('authorization');

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const apiKey = await prisma.apiKey.findUnique({ where: { key: token } });
      if (!apiKey) {
        return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
      }
      authenticatedUserId = apiKey.userId;
    } else {
      const cookieStore = await cookies();
      const token = cookieStore.get('auth_token')?.value;

      if (!token) {
        return NextResponse.json({ error: 'Unauthorized. Missing API key or session.' }, { status: 401 });
      }

      const payload = await verifyToken(token);
      if (!payload || !payload.userId) {
        return NextResponse.json({ error: 'Invalid session token' }, { status: 401 });
      }
      authenticatedUserId = payload.userId as string;
    }

    // 2. Fetch the deployment and its model
    const deployment = await prisma.deployment.findUnique({
      where: { endpointSlug: slug },
      include: {
        model: {
          include: {
            experiment: {
              include: { dataset: true }
            }
          }
        }
      }
    });

    if (!deployment) {
      return NextResponse.json({ error: 'Deployment not found.' }, { status: 404 });
    }

    if (deployment.status !== 'ACTIVE') {
      return NextResponse.json({ error: `Deployment is currently ${deployment.status}` }, { status: 403 });
    }
    
    // Verify ownership
    if (deployment.model.experiment.dataset.userId !== authenticatedUserId) {
       return NextResponse.json({ error: 'Unauthorized access to this deployment.' }, { status: 403 });
    }

    // 3. Extract the features from the request body
    const body = await req.json();
    const { inputData } = body;
    
    if (!inputData || typeof inputData !== 'object') {
       return NextResponse.json({ error: 'Valid inputData object is required.' }, { status: 400 });
    }

    // 4. Forward the request to the Python ML Worker
    const mlWorkerUrl = process.env.ML_WORKER_URL || 'http://127.0.0.1:8000';
    
    // Track latency
    const startTime = Date.now();
    
    const workerRes = await fetch(`${mlWorkerUrl}/internal/ml/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deploymentId: deployment.id,
        s3Url: deployment.model.s3ModelPath,
        inputData
      })
    });

    const workerData = await workerRes.json();
    const latencyMs = Date.now() - startTime;

    if (!workerRes.ok) {
       console.error("Worker error:", workerData);
       return NextResponse.json({ error: 'Prediction failed on the ML worker.' }, { status: 500 });
    }
    
    // 5. Update Deployment totalRequests
    await prisma.deployment.update({
      where: { id: deployment.id },
      data: { totalRequests: { increment: 1 } }
    });

    // Note: The python worker already logs to PredictionLog, so we just return the result
    return NextResponse.json({ 
      prediction: workerData.prediction,
      latencyMs
    }, { status: 200 });

  } catch (error: any) {
    console.error('Prediction API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
