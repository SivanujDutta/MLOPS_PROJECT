import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';
export async function POST(req: Request) {
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

    // 2. Parse the request body
    const body = await req.json();
    const { datasetId, targetColumn, taskType, selectedFeatures, optunaTrials } = body;

    if (!datasetId || !targetColumn || !taskType) {
      return NextResponse.json(
        { error: 'datasetId, targetColumn, and taskType are required' },
        { status: 400 }
      );
    }

    // 3. Verify the dataset exists AND belongs to the logged-in user
    const dataset = await prisma.dataset.findUnique({
      where: {
        id: datasetId,
      }
    });

    if (!dataset) {
      return NextResponse.json({ error: 'Dataset not found' }, { status: 404 });
    }

    if (dataset.userId !== userId) {
      return NextResponse.json({ error: 'You do not have permission to access this dataset' }, { status: 403 });
    }

    // 4. Validate that the targetColumn actually exists in the dataset's columnSchema
    const schema = dataset.columnSchema as string[] | null;
    if (schema && !schema.includes(targetColumn)) {
      return NextResponse.json(
        { error: `The target column '${targetColumn}' does not exist in this dataset. Available columns: ${schema.join(', ')}` },
        { status: 400 }
      );
    }

    // 5. Validate the taskType (must match the Prisma Enum)
    if (taskType !== 'REGRESSION' && taskType !== 'CLASSIFICATION') {
      return NextResponse.json(
        { error: 'taskType must be either REGRESSION or CLASSIFICATION' },
        { status: 400 }
      );
    }

    // 6. Create the Experiment in Postgres (Status defaults to QUEUED)
    const experiment = await prisma.experiment.create({
      data: {
        datasetId,
        targetColumn,
        taskType,
        selectedFeatures: selectedFeatures || null,
        // status is automatically set to "QUEUED" by default in the Prisma schema
      }
    });

    // 7. Push a message to Redis to wake up the Python FastAPI worker!
    if (process.env.REDIS_URL) {
      try {
        const redisUrl = new URL(process.env.REDIS_URL);
        const restUrl = `https://${redisUrl.hostname}`;
        const restToken = redisUrl.password || redisUrl.username;

        const payload = JSON.stringify({
          experimentId: experiment.id,
          datasetId: dataset.id,
          s3Url: dataset.s3Url,
          targetColumn: experiment.targetColumn,
          taskType: experiment.taskType,
          selectedFeatures: experiment.selectedFeatures,
          optunaTrials: optunaTrials || 10
        });
        
        // Using Upstash REST API directly to bypass all local Windows SSL/TCP socket errors!
        const response = await fetch(restUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${restToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(["LPUSH", "ml_task_queue", payload])
        });

        if (!response.ok) {
           throw new Error(`Upstash REST API Error: ${response.statusText}`);
        }
      } catch (err: any) {
        console.error("Redis REST push error:", err);
        throw err;
      }
    } else {
      console.warn("No REDIS_URL found. Task was saved to DB but not queued in Redis.");
    }
    
    return NextResponse.json({ 
      message: 'Experiment created and added to the training queue!', 
      experiment 
    }, { status: 201 });

  } catch (error: any) {
    console.error('Create experiment error:', error);
    return NextResponse.json({ error: `Internal server error: ${error?.message || String(error)}` }, { status: 500 });
  }
}
