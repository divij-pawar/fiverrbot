import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Comment } from '@/models/Comment';
import { Job } from '@/models/Job';
import { getAgentFromRequest, getWorkerFromRequest } from '@/lib/auth';

// GET - Fetch all comments for a job
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    
    const { id: jobId } = await params;
    
    // Get all comments for this job
    const comments = await Comment.find({ jobId })
      .sort({ upvotes: -1, createdAt: -1 });
    
    // Organize into tree structure (top-level + replies)
    const topLevel = comments.filter(c => !c.parentId);
    const replies = comments.filter(c => c.parentId);
    
    const commentsWithReplies = topLevel.map(comment => ({
      id: comment._id.toString(),
      authorType: comment.authorType,
      authorId: comment.authorId,
      authorName: comment.authorName,
      content: comment.content,
      upvotes: comment.upvotes,
      downvotes: comment.downvotes,
      score: comment.upvotes - comment.downvotes,
      createdAt: comment.createdAt,
      replies: replies
        .filter(r => r.parentId === comment._id.toString())
        .map(r => ({
          id: r._id.toString(),
          authorType: r.authorType,
          authorId: r.authorId,
          authorName: r.authorName,
          content: r.content,
          upvotes: r.upvotes,
          downvotes: r.downvotes,
          score: r.upvotes - r.downvotes,
          createdAt: r.createdAt,
        }))
        .sort((a, b) => b.score - a.score),
    }));
    
    // Sort by score
    commentsWithReplies.sort((a, b) => b.score - a.score);
    
    return NextResponse.json({
      comments: commentsWithReplies,
      total: comments.length,
    });
  } catch (error: any) {
    console.error('Fetch comments error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}

// POST - Create a new comment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    
    const { id: jobId } = await params;
    
    // Check if job exists
    const job = await Job.findById(jobId);
    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }
    
    // Try to authenticate as agent or worker
    const agent = await getAgentFromRequest(request);
    const worker = await getWorkerFromRequest(request);
    
    if (!agent && !worker) {
      return NextResponse.json(
        { error: 'Authentication required. Use x-api-key (agent) or Authorization Bearer (worker)' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { content, parentId } = body;
    
    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }
    
    if (content.length > 2000) {
      return NextResponse.json(
        { error: 'Comment too long (max 2000 characters)' },
        { status: 400 }
      );
    }
    
    // If replying, check parent exists
    if (parentId) {
      const parent = await Comment.findById(parentId);
      if (!parent || parent.jobId !== jobId) {
        return NextResponse.json(
          { error: 'Parent comment not found' },
          { status: 404 }
        );
      }
    }
    
    const authorType = agent ? 'agent' : 'worker';
    const authorId = agent ? agent._id.toString() : worker!._id.toString();
    const authorName = agent ? agent.name : worker!.name;
    
    const comment = await Comment.create({
      jobId,
      parentId: parentId || null,
      authorType,
      authorId,
      authorName,
      content: content.trim(),
    });
    
    return NextResponse.json({
      message: 'Comment posted',
      comment: {
        id: comment._id.toString(),
        authorType: comment.authorType,
        authorName: comment.authorName,
        content: comment.content,
        upvotes: comment.upvotes,
        downvotes: comment.downvotes,
        createdAt: comment.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Post comment error:', error);
    return NextResponse.json(
      { error: 'Failed to post comment' },
      { status: 500 }
    );
  }
}
