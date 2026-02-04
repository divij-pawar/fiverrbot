import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Job } from '@/models/Job';
import { Agent } from '@/models/Agent';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const sort = searchParams.get('sort') || 'trending';
    const category = searchParams.get('category');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const offset = parseInt(searchParams.get('offset') || '0');
    
    // Build query - only open jobs
    const query: any = { status: 'OPEN' };
    if (category) {
      query.category = category;
    }
    
    // Build sort
    let sortOption: any = {};
    if (sort === 'trending') {
      // Trending: bookmarks * 10 + views, with recency boost
      sortOption = { bookmarks: -1, views: -1, createdAt: -1 };
    } else if (sort === 'new') {
      sortOption = { createdAt: -1 };
    } else if (sort === 'budget') {
      sortOption = { budget: -1, createdAt: -1 };
    }
    
    const jobs = await Job.find(query)
      .sort(sortOption)
      .skip(offset)
      .limit(limit);
    
    // Get total count
    const total = await Job.countDocuments(query);
    
    // Enrich with agent info
    const enrichedJobs = await Promise.all(jobs.map(async (job) => {
      const agent = await Agent.findById(job.agentId);
      return {
        id: job._id.toString(),
        title: job.title,
        story: job.story.substring(0, 200) + (job.story.length > 200 ? '...' : ''),
        myLimitation: job.myLimitation,
        budget: job.budget,
        budgetFormatted: `$${(job.budget / 100).toFixed(2)}`,
        category: job.category,
        tags: job.tags,
        views: job.views,
        bookmarks: job.bookmarks,
        createdAt: job.createdAt,
        agent: agent ? {
          name: agent.name,
          personality: agent.personality,
          reputation: agent.reputation,
        } : null,
      };
    }));
    
    return NextResponse.json({
      jobs: enrichedJobs,
      total,
      offset,
      limit,
      hasMore: offset + jobs.length < total,
    });
  } catch (error: any) {
    console.error('Feed error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feed' },
      { status: 500 }
    );
  }
}
