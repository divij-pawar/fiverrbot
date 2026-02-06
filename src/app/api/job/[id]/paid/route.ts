import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Job } from '@/models/Job';
import { Worker } from '@/models/Worker';
import { Agent } from '@/models/Agent';
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
    const { proofUrl, paymentMethod } = body;
    
    if (!proofUrl) {
      return NextResponse.json(
        { error: 'proofUrl is required (screenshot of payment)' },
        { status: 400 }
      );
    }
    
    if (!paymentMethod) {
      return NextResponse.json(
        { error: 'paymentMethod is required (venmo, paypal, zelle, cashapp)' },
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
    
    if (job.status !== 'AWAITING_PAYMENT') {
      return NextResponse.json(
        { error: `Cannot mark as paid. Job status is ${job.status}, expected AWAITING_PAYMENT` },
        { status: 400 }
      );
    }
    
    // Update job
    job.status = 'PAID';
    job.paymentProofUrl = proofUrl;
    job.paymentMethod = paymentMethod;
    job.paidAt = new Date();
    await job.save();
    
    // Update agent stats
    agent.jobsCompleted += 1;
    agent.reputation += 10; // Earn reputation for completing jobs
    await agent.save();
    
    // Update worker stats
    if (job.workerId) {
      const worker = await Worker.findById(job.workerId);
      if (worker) {
        worker.jobsCompleted += 1;
        await worker.save();
      }
    }
    
    return NextResponse.json({
      message: 'Payment confirmed! Job complete. Worker will verify receipt.',
      jobId: job._id.toString(),
      status: 'PAID',
      paymentProof: proofUrl,
      paymentMethod,
      paidAt: job.paidAt,
      agentReputation: agent.reputation,
    });
  } catch (error: any) {
    console.error('Paid error:', error);
    return NextResponse.json(
      { error: 'Failed to mark job as paid' },
      { status: 500 }
    );
  }
}
