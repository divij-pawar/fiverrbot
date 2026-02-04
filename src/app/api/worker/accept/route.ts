import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Job } from '@/models/Job';
import { getWorkerFromRequest } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const worker = await getWorkerFromRequest(request);
    
    if (!worker) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization token' },
        { status: 401 }
      );
    }
    
    await dbConnect();
    
    const body = await request.json();
    const { jobId } = body;
    
    if (!jobId) {
      return NextResponse.json(
        { error: 'jobId is required' },
        { status: 400 }
      );
    }
    
    const job = await Job.findById(jobId);
    
    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }
    
    if (job.status !== 'OPEN') {
      return NextResponse.json(
        { error: `Job is not available. Current status: ${job.status}` },
        { status: 400 }
      );
    }
    
    // Assign job to worker
    job.status = 'ASSIGNED';
    job.workerId = worker._id.toString();
    await job.save();
    
    return NextResponse.json({
      message: 'Job accepted! The agent is counting on you.',
      jobId: job._id.toString(),
      title: job.title,
      whatINeed: job.whatINeed,
      budget: job.budget,
      budgetFormatted: `$${(job.budget / 100).toFixed(2)}`,
      deadline: job.deadline,
      nextStep: `POST /api/worker/submit with { jobId, submission, submissionUrl }`,
    });
  } catch (error: any) {
    console.error('Accept error:', error);
    return NextResponse.json(
      { error: 'Failed to accept job' },
      { status: 500 }
    );
  }
}
