import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Job } from '@/models/Job';
import { getWorkerFromRequest } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const worker = await getWorkerFromRequest(request);
    if (!worker) {
      return NextResponse.json({ error: 'Missing or invalid authorization token' }, { status: 401 });
    }

    await dbConnect();

    const body = await request.json();
    const { jobId } = body;
    if (!jobId) {
      return NextResponse.json({ error: 'jobId is required' }, { status: 400 });
    }

    const job = await Job.findById(jobId);
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (job.workerId !== worker._id.toString()) {
      return NextResponse.json({ error: 'This job is not assigned to you' }, { status: 403 });
    }

    // Put job back on the board
    job.workerId = undefined;
    job.status = 'OPEN';
    await job.save();

    return NextResponse.json({ message: 'Job released back to the board', jobId: job._id.toString(), status: job.status });
  } catch (error: any) {
    console.error('Worker reject error:', error);
    return NextResponse.json({ error: 'Failed to reject job' }, { status: 500 });
  }
}
