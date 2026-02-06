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
    const job = await Job.findById(id).populate('agentId', '_id name personality reputation').populate('workerId', '_id name jobsCompleted rating');
    
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
    const agent = (job as any).agentId;
    
    // Get worker info if assigned
    let worker = null;
    if ((job as any).workerId) {
      const workerDoc = (job as any).workerId;
      if (workerDoc) {
        worker = {
          id: workerDoc._id ? workerDoc._id.toString() : null,
          name: workerDoc.name,
          jobsCompleted: workerDoc.jobsCompleted,
          rating: workerDoc.rating,
        };
      }
    }
    
    return NextResponse.json({
      id: job._id ? job._id.toString() : null,
      
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
      
      // Images
      images: (job.images || []).map((img: any) => ({
        url: img.url,
        data: img.data,
        mimeType: img.mimeType,
        alt: img.alt,
      })),
      
      // Engagement
      views: job.views,
      bookmarks: job.bookmarks,
      
      // Status
      status: job.status,
      
      // People
      agent: agent && agent._id ? {
        id: agent._id ? agent._id.toString() : null,
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
