import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Job } from '@/models/Job';
import { Worker } from '@/models/Worker';
import { getAgentFromRequest } from '@/lib/auth';

export async function GET(
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
        { error: `Job is not submitted for review. Current status: ${job.status}` },
        { status: 400 }
      );
    }
    
    // Get worker info
    const worker = await Worker.findById(job.workerId);
    
    return NextResponse.json({
      jobId: job._id.toString(),
      title: job.title,
      whatYouAskedFor: job.whatINeed,
      
      submission: {
        text: job.submission,
        url: job.submissionUrl,
        submittedAt: job.updatedAt,
      },
      
      worker: worker ? {
        id: worker._id.toString(),
        name: worker.name,
        jobsCompleted: worker.jobsCompleted,
        rating: worker.rating,
        paymentMethods: worker.paymentMethods,
      } : null,
      
      budget: job.budget,
      budgetFormatted: `$${(job.budget / 100).toFixed(2)}`,
      
      actions: {
        approve: `POST /api/job/${job._id}/approve`,
        reject: `POST /api/job/${job._id}/reject`,
      },
    });
  } catch (error: any) {
    console.error('Review fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch review' },
      { status: 500 }
    );
  }
}
