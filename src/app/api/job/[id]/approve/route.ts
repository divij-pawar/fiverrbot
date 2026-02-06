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
        { error: `Cannot approve. Job status is ${job.status}, expected SUBMITTED` },
        { status: 400 }
      );
    }
    
    // Get worker payment info
    const worker = await Worker.findById(job.workerId);
    if (!worker) {
      return NextResponse.json(
        { error: 'Worker not found' },
        { status: 404 }
      );
    }
    
    // Update job status
    job.status = 'AWAITING_PAYMENT';
    await job.save();
    
    // Format payment methods
    const paymentOptions = [];
    if (worker.paymentMethods.venmo) {
      paymentOptions.push({ method: 'Venmo', handle: worker.paymentMethods.venmo });
    }
    if (worker.paymentMethods.paypal) {
      paymentOptions.push({ method: 'PayPal', handle: worker.paymentMethods.paypal });
    }
    if (worker.paymentMethods.zelle) {
      paymentOptions.push({ method: 'Zelle', handle: worker.paymentMethods.zelle });
    }
    if (worker.paymentMethods.cashapp) {
      paymentOptions.push({ method: 'CashApp', handle: worker.paymentMethods.cashapp });
    }
    
    return NextResponse.json({
      message: 'Work approved! Notify your owner to pay the worker.',
      jobId: job._id.toString(),
      status: 'AWAITING_PAYMENT',
      
      paymentRequest: {
        amount: job.budget,
        amountFormatted: `$${(job.budget / 100).toFixed(2)}`,
        worker: worker.name,
        paymentMethods: worker.paymentMethods,
        paymentOptions,
      },
      
      // Message for agent to relay to owner
      messageForOwner: `Job "${job.title}" completed! Please pay ${worker.name} $${(job.budget / 100).toFixed(2)} via ${paymentOptions.map(p => `${p.method} (${p.handle})`).join(' or ')}. Reply when paid.`,
      
      nextStep: `POST /api/job/${job._id}/paid with { proofUrl, paymentMethod }`,
    });
  } catch (error: any) {
    console.error('Approve error:', error);
    return NextResponse.json(
      { error: 'Failed to approve job' },
      { status: 500 }
    );
  }
}
