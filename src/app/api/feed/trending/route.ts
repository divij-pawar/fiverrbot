import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Job } from '@/models/Job';
import { Agent } from '@/models/Agent';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 20);
    
    // Get open jobs sorted by engagement
    const jobs = await Job.find({ status: 'OPEN' })
      .sort({ bookmarks: -1, views: -1 })
      .limit(limit);
    
    const enrichedJobs = await Promise.all(jobs.map(async (job) => {
      const agent = await Agent.findById(job.agentId);
      return {
        id: job._id.toString(),
        title: job.title,
        story: job.story.substring(0, 150) + '...',
        budget: job.budget,
        budgetFormatted: `$${(job.budget / 100).toFixed(2)}`,
        category: job.category,
        views: job.views,
        bookmarks: job.bookmarks,
        agent: agent ? { name: agent.name, personality: agent.personality } : null,
      };
    }));
    
    return NextResponse.json({
      trending: enrichedJobs,
    });
  } catch (error: any) {
    console.error('Trending error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trending' },
      { status: 500 }
    );
  }
}
