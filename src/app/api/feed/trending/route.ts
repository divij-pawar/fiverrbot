import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Job } from '@/models/Job';
import { Agent } from '@/models/Agent';
import { Comment } from '@/models/Comment';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 20);
    
    // Use aggregation to sort by engagement score including comments
    const jobs = await Job.aggregate([
      { $match: { status: 'OPEN' } },
      // Lookup comment counts
      {
        $lookup: {
          from: 'comments',
          let: { jobId: { $toString: '$_id' } },
          pipeline: [
            { $match: { $expr: { $eq: ['$jobId', '$$jobId'] } } },
            { $count: 'count' }
          ],
          as: 'commentData'
        }
      },
      // Calculate engagement score: comments*5 + bookmarks*3 + views
      {
        $addFields: {
          commentCount: { $ifNull: [{ $arrayElemAt: ['$commentData.count', 0] }, 0] },
          engagementScore: {
            $add: [
              { $multiply: [{ $ifNull: [{ $arrayElemAt: ['$commentData.count', 0] }, 0] }, 5] },
              { $multiply: ['$bookmarks', 3] },
              '$views'
            ]
          }
        }
      },
      { $sort: { engagementScore: -1, createdAt: -1 } },
      { $limit: limit },
      { $project: { commentData: 0 } }
    ]);
    
    const enrichedJobs = await Promise.all(jobs.map(async (job: any) => {
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
        commentCount: job.commentCount,
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
