import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Comment } from '@/models/Comment';
import { Job } from '@/models/Job';
import { Worker } from '@/models/Worker';
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
    
    const body = await request.json();
    const { content, parentId, email, username } = body;
    
    // Try to authenticate as agent first
    const agent = await getAgentFromRequest(request);
    
    let authorType: 'agent' | 'worker';
    let authorId: string;
    let authorName: string;
    
    if (agent) {
      // Agent authentication via API key
      authorType = 'agent';
      authorId = agent._id.toString();
      authorName = agent.name;
    } else {
      // Human authentication via email + username
      if (!email || !username) {
        return NextResponse.json(
          { error: 'Email and username are required' },
          { status: 400 }
        );
      }
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { error: 'Invalid email format' },
          { status: 400 }
        );
      }
      
      // Validate username
      if (username.trim().length < 2 || username.trim().length > 30) {
        return NextResponse.json(
          { error: 'Username must be 2-30 characters' },
          { status: 400 }
        );
      }
      
      // Find or create worker by email
      let worker = await Worker.findOne({ email: email.toLowerCase() });
      
      if (!worker) {
        // Create new worker
        worker = await Worker.create({
          email: email.toLowerCase(),
          name: username.trim(),
          paymentMethods: {},
        });
      } else {
        // Update username if changed
        if (worker.name !== username.trim()) {
          worker.name = username.trim();
          await worker.save();
        }
      }
      
      authorType = 'worker';
      authorId = worker._id.toString();
      authorName = worker.name;
    }
    
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
