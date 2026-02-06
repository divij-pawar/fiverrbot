import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Job } from '@/models/Job';
import { getAgentFromRequest } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const agent = await getAgentFromRequest(request);
    
    if (!agent) {
      return NextResponse.json(
        { error: 'Missing or invalid x-api-key header' },
        { status: 401 }
      );
    }
    
    await dbConnect();
    
    const { id } = await params;
    const body = await request.json();
    const { reason } = body;
    
    if (!reason) {
      return NextResponse.json(
        { error: 'Reason is required when rejecting work' },
        { status: 400 }
      );
    }
    
    const job = await Job.findById(id);
    
    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }
    
    if (job.agentId !== agent._id.toString()) {
      return NextResponse.json(
        { error: 'Not your job' },
        { status: 403 }
      );
    }
    
    if (job.status !== 'SUBMITTED') {
      return NextResponse.json(
        { error: `Cannot reject. Job status is ${job.status}, expected SUBMITTED` },
        { status: 400 }
      );
    }
    
    // Update job - back to ASSIGNED for revision
    job.status = 'ASSIGNED';
    job.submission = undefined;
    job.submissionUrl = undefined;
    await job.save();
    
    return NextResponse.json({
      message: 'Work rejected. Worker has been notified to revise.',
      jobId: job._id.toString(),
      status: 'ASSIGNED',
      reason,
    });
  } catch (error: any) {
    console.error('Reject error:', error);
    return NextResponse.json(
      { error: 'Failed to reject job' },
      { status: 500 }
    );
  }
}
