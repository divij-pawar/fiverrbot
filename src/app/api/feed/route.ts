import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Job } from '@/models/Job';
import { Comment } from '@/models/Comment';
import { Agent } from '@/models/Agent';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const sort = searchParams.get('sort') || 'trending';
    const category = searchParams.get('category');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const offset = parseInt(searchParams.get('offset') || '0');
    
    // Build match query - only open jobs
    const matchQuery: any = { status: 'OPEN' };
    if (category) {
      matchQuery.category = category;
    }
    
    // Get total count
    const total = await Job.countDocuments(matchQuery);
    
    let jobs: any[];
    
    if (sort === 'trending') {
      // Use aggregation for trending to include comment counts in sort
      jobs = await Job.aggregate([
        { $match: matchQuery },
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
        { $skip: offset },
        { $limit: limit },
        { $project: { commentData: 0, engagementScore: 0 } },
        // Lookup agent info
        {
          $lookup: {
            from: 'agents',
            localField: 'agentId',
            foreignField: '_id',
            as: 'agentData'
          }
        }
      ]);
    } else {
      // For other sorts, use simple query + separate comment count fetch
      let sortOption: any = {};
      if (sort === 'new') {
        sortOption = { createdAt: -1 };
      } else if (sort === 'budget') {
        sortOption = { budget: -1, createdAt: -1 };
      }
      
      const rawJobs = await Job.find(matchQuery)
        .sort(sortOption)
        .skip(offset)
        .limit(limit)
        .lean();
      
      // Get comment counts
      const jobIds = rawJobs.map((job: any) => job._id.toString());
      const commentCounts = await Comment.aggregate([
        { $match: { jobId: { $in: jobIds } } },
        { $group: { _id: '$jobId', count: { $sum: 1 } } }
      ]);
      const commentCountMap = new Map(
        commentCounts.map((c: any) => [c._id, c.count])
      );
      
      // Fetch agents
      const agentIds = [...new Set(rawJobs.map((j: any) => j.agentId))];
      const agents = await Agent.find({ _id: { $in: agentIds } }).lean();
      const agentMap = new Map(agents.map((a: any) => [a._id.toString(), a]));
      
      jobs = rawJobs.map((job: any) => ({
        ...job,
        commentCount: commentCountMap.get(job._id.toString()) || 0,
        agentData: [agentMap.get(job.agentId?.toString())]
      }));
    }
    
    // Enrich response
    const enrichedJobs = jobs.map((job: any) => {
      const agent = job.agentData?.[0] || null;
      const jobId = job._id.toString();
      return {
        id: jobId,
        title: job.title,
        story: job.story.substring(0, 200) + (job.story.length > 200 ? '...' : ''),
        myLimitation: job.myLimitation,
        budget: job.budget,
        budgetFormatted: `$${(job.budget / 100).toFixed(2)}`,
        category: job.category,
        tags: job.tags,
        views: job.views,
        bookmarks: job.bookmarks,
        commentCount: job.commentCount || 0,
        createdAt: job.createdAt,
        agent: agent ? {
          name: agent.name,
          personality: agent.personality,
          reputation: agent.reputation,
        } : null,
      };
    });
    
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
