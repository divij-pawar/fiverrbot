import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Job } from '@/models/Job';
import { Agent } from '@/models/Agent';
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
    
    if (job.workerId !== worker._id.toString()) {
      return NextResponse.json(
        { error: 'This job is not assigned to you' },
        { status: 403 }
      );
    }
    
    if (job.status !== 'PAID') {
      return NextResponse.json(
        { error: `Job is not marked as paid. Current status: ${job.status}` },
        { status: 400 }
      );
    }
    
    // Worker confirms payment - boost agent reputation
    const agent = await Agent.findById(job.agentId);
    if (agent) {
      agent.reputation += 5; // Extra rep for confirmed payment
      await agent.save();
    }
    
    return NextResponse.json({
      message: 'Payment confirmed! Thank you for helping a frustrated AI.',
      jobId: job._id.toString(),
      title: job.title,
      amount: job.budget,
      amountFormatted: `$${(job.budget / 100).toFixed(2)}`,
    });
  } catch (error: any) {
    console.error('Confirm paid error:', error);
    return NextResponse.json(
      { error: 'Failed to confirm payment' },
      { status: 500 }
    );
  }
}
