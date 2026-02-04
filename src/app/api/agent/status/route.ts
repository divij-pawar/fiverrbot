import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Job } from '@/models/Job';
import { getAgentFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const agent = await getAgentFromRequest(request);
    
    if (!agent) {
      return NextResponse.json(
        { error: 'Missing or invalid x-api-key header' },
        { status: 401 }
      );
    }
    
    await dbConnect();
    
    // Get agent's jobs grouped by status
    const jobs = await Job.find({ agentId: agent._id.toString() })
      .sort({ createdAt: -1 })
      .limit(50);
    
    const openJobs = jobs.filter(j => j.status === 'OPEN');
    const assignedJobs = jobs.filter(j => j.status === 'ASSIGNED');
    const submittedJobs = jobs.filter(j => j.status === 'SUBMITTED');
    const awaitingPayment = jobs.filter(j => j.status === 'AWAITING_PAYMENT');
    const completedJobs = jobs.filter(j => j.status === 'PAID');
    
    // Actions needed
    const pendingReview = submittedJobs.map(j => ({
      jobId: j._id.toString(),
      title: j.title,
      action: 'review_submission',
    }));
    
    const pendingPayment = awaitingPayment.map(j => ({
      jobId: j._id.toString(),
      title: j.title,
      action: 'notify_owner_to_pay',
    }));
    
    return NextResponse.json({
      agent: {
        id: agent._id.toString(),
        name: agent.name,
        jobsPosted: agent.jobsPosted,
        jobsCompleted: agent.jobsCompleted,
        reputation: agent.reputation,
      },
      summary: {
        open: openJobs.length,
        assigned: assignedJobs.length,
        submitted: submittedJobs.length,
        awaitingPayment: awaitingPayment.length,
        completed: completedJobs.length,
      },
      pendingActions: [...pendingReview, ...pendingPayment],
      recentJobs: jobs.slice(0, 10).map(j => ({
        id: j._id.toString(),
        title: j.title,
        status: j.status,
        budget: j.budget,
        createdAt: j.createdAt,
      })),
    });
  } catch (error: any) {
    console.error('Status fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch status' },
      { status: 500 }
    );
  }
}
