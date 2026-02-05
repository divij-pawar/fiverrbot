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
    const status = searchParams.get('status');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const offset = parseInt(searchParams.get('offset') || '0');
    
    // Build match query
    const matchQuery: any = {};
    if (category) {
      matchQuery.category = category;
    }
    if (status) {
      matchQuery.status = status;
    }
    
    // Get total count
    const total = await Job.countDocuments(matchQuery);
    
    // Determine sort stage based on sort parameter
    let sortStage: any = {};
    if (sort === 'new') {
      sortStage = { createdAt: -1 };
    } else if (sort === 'budget') {
      sortStage = { budget: -1, createdAt: -1 };
    } else {
      // trending - will be calculated via engagementScore
      sortStage = { engagementScore: -1, createdAt: -1 };
    }

    // Status priority: OPEN first (1), PAID last (999), others in middle (500)
    const statusPriority = {
      'OPEN': 1,
      'ASSIGNED': 500,
      'SUBMITTED': 500,
      'APPROVED': 500,
      'AWAITING_PAYMENT': 500,
      'DISPUTED': 500,
      'CANCELLED': 500,
      'PAID': 999,
    };

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
            },
            statusPriority: {
              $switch: {
                branches: [
                  { case: { $eq: ['$status', 'OPEN'] }, then: 1 },
                  { case: { $eq: ['$status', 'PAID'] }, then: 999 },
                ],
                default: 500
              }
            }
          }
        },
        { $sort: { statusPriority: 1, engagementScore: -1, createdAt: -1 } },
        { $skip: offset },
        { $limit: limit },
        { $project: { commentData: 0, engagementScore: 0, statusPriority: 0 } },
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
      
      // Fetch all jobs without limit first to apply status-based sorting
      const rawJobs = await Job.find(matchQuery)
        .lean();
      
      // Sort by status priority first, then by specified sort
      rawJobs.sort((a: any, b: any) => {
        const priorityA = statusPriority[a.status as keyof typeof statusPriority] || 500;
        const priorityB = statusPriority[b.status as keyof typeof statusPriority] || 500;
        
        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }
        
        // Within same priority, apply secondary sort
        if (sort === 'new') {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        } else if (sort === 'budget') {
          if (b.budget !== a.budget) return b.budget - a.budget;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        return 0;
      });
      
      // Apply pagination after sorting
      const paginatedJobs = rawJobs.slice(offset, offset + limit);
      
      // Get comment counts
      const jobIds = paginatedJobs.map((job: any) => job._id.toString());
      const commentCounts = await Comment.aggregate([
        { $match: { jobId: { $in: jobIds } } },
        { $group: { _id: '$jobId', count: { $sum: 1 } } }
      ]);
      const commentCountMap = new Map(
        commentCounts.map((c: any) => [c._id, c.count])
      );
      
      // Fetch agents
      const agentIds = [...new Set(paginatedJobs.map((j: any) => j.agentId))];
      const agents = await Agent.find({ _id: { $in: agentIds } }).lean();
      const agentMap = new Map(agents.map((a: any) => [a._id.toString(), a]));
      
      jobs = paginatedJobs.map((job: any) => ({
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
        status: job.status,
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
