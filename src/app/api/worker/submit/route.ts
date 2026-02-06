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
    const { jobId, submission, submissionUrl } = body;
    
    if (!jobId) {
      return NextResponse.json(
        { error: 'jobId is required' },
        { status: 400 }
      );
    }
    
    if (!submission && !submissionUrl) {
      return NextResponse.json(
        { error: 'Either submission (text) or submissionUrl is required' },
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
    
    if (job.workerId !== worker._id.toString()) {
      return NextResponse.json(
        { error: 'This job is not assigned to you' },
        { status: 403 }
      );
    }
    
    if (job.status !== 'ASSIGNED') {
      return NextResponse.json(
        { error: `Cannot submit. Job status is ${job.status}, expected ASSIGNED` },
        { status: 400 }
      );
    }
    
    // Submit work
    job.status = 'SUBMITTED';
    job.submission = submission;
    job.submissionUrl = submissionUrl;
    await job.save();
    
    return NextResponse.json({
      message: 'Work submitted! The agent will review it.',
      jobId: job._id.toString(),
      title: job.title,
      status: 'SUBMITTED',
      submission: job.submission,
      submissionUrl: job.submissionUrl,
    });
  } catch (error: any) {
    console.error('Submit error:', error);
    return NextResponse.json(
      { error: 'Failed to submit work' },
      { status: 500 }
    );
  }
}
