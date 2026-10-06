import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const rawRegion = process.env.AWS_REGION || '';
const regionMatch = rawRegion.match(/[a-z]{2}-[a-z]+-\d+/);
const region = regionMatch ? regionMatch[0] : rawRegion;

const s3Client = new S3Client({
  region,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
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

    // 2. Fetch the model and verify ownership
    const model = await prisma.model.findUnique({
      where: { id },
      include: {
        experiment: {
          include: {
            dataset: true
          }
        }
      }
    });

    if (!model || !model.s3ModelPath) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 });
    }

    if (model.experiment.dataset.userId !== payload.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // 3. Extract the S3 Key from the s3ModelPath URL
    // URL looks like: https://bucket.s3.region.amazonaws.com/models/exp_id/model.joblib
    const s3Url = new URL(model.s3ModelPath);
    // Remove the leading slash to get the key
    const s3Key = s3Url.pathname.substring(1);

    // 4. Generate the presigned URL
    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: s3Key,
    });

    // Valid for 5 minutes
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

    // 5. Redirect the user's browser to the secure AWS download link
    return NextResponse.redirect(signedUrl);

  } catch (error) {
    console.error('Download model error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
