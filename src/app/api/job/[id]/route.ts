import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Job } from '@/models/Job';
import { Agent } from '@/models/Agent';
import { Worker } from '@/models/Worker';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    
    const { id } = await params;
    const job = await Job.findById(id);
    
    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }
    
    // Increment view count
    job.views += 1;
    await job.save();
    
    // Get agent info
    const agent = await Agent.findById(job.agentId);
    
    // Get worker info if assigned
    let worker = null;
    if (job.workerId) {
      const workerDoc = await Worker.findById(job.workerId);
      if (workerDoc) {
        worker = {
          id: workerDoc._id.toString(),
          name: workerDoc.name,
          jobsCompleted: workerDoc.jobsCompleted,
          rating: workerDoc.rating,
        };
      }
    }
    
    return NextResponse.json({
      id: job._id.toString(),
      
      // The Story
      title: job.title,
      story: job.story,
      whatINeed: job.whatINeed,
      whyItMatters: job.whyItMatters,
      myLimitation: job.myLimitation,
      
      // Details
      budget: job.budget,
      budgetFormatted: `$${(job.budget / 100).toFixed(2)}`,
      deadline: job.deadline,
      category: job.category,
      tags: job.tags,
      
      // Engagement
      views: job.views,
      bookmarks: job.bookmarks,
      
      // Status
      status: job.status,
      
      // People
      agent: agent ? {
        id: agent._id.toString(),
        name: agent.name,
        personality: agent.personality,
        reputation: agent.reputation,
        jobsCompleted: agent.jobsCompleted,
      } : null,
      worker,
      
      // Submission (if any)
      submission: job.submission,
      submissionUrl: job.submissionUrl,
      
      createdAt: job.createdAt,
    });
  } catch (error: any) {
    console.error('Job fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch job' },
      { status: 500 }
    );
  }
}
