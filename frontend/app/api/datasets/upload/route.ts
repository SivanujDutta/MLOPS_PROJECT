import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { parse } from 'csv-parse/sync';
import crypto from 'crypto';

// Clean up the AWS region string from .env
// (Fixes the "Europe (Stockholm) eu-north-1" copy-paste format from the AWS console)
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

    // 2. Parse the multipart/form-data
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const name = formData.get('name') as string || (file ? file.name : 'Unnamed Dataset');

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (!file.name.endsWith('.csv')) {
      return NextResponse.json({ error: 'Only CSV files are supported' }, { status: 400 });
    }

    // Convert the file into a Node Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 3. Parse CSV metadata
    let rowCount = 0;
    let columnSchema: string[] = [];

    try {
      // Parse the CSV to extract headers and count total rows
      const records = parse(buffer, {
        columns: true, // Treat first row as headers
        skip_empty_lines: true,
      }) as Record<string, string>[];

      rowCount = records.length;
      if (rowCount > 0) {
        columnSchema = Object.keys(records[0]);
      }
    } catch (parseError) {
      console.error('CSV Parse Error:', parseError);
      return NextResponse.json({ error: 'Failed to parse CSV file. Ensure it is valid.' }, { status: 400 });
    }

    // 4. Upload to S3
    const fileId = crypto.randomUUID();
    const s3Key = `datasets/${userId}/${fileId}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
    
    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: s3Key,
        Body: buffer,
        ContentType: 'text/csv',
      })
    );

    const s3Url = `https://${process.env.S3_BUCKET_NAME}.s3.${region}.amazonaws.com/${s3Key}`;

    // 5. Save metadata to Prisma
    const dataset = await prisma.dataset.create({
      data: {
        userId,
        name,
        s3Url,
        rowCount,
        columnSchema,
      },
    });

    return NextResponse.json({ message: 'Dataset uploaded successfully', dataset }, { status: 201 });

  } catch (error) {
    console.error('Dataset upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
