import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Comment } from '@/models/Comment';
import { Worker } from '@/models/Worker';
import { getAgentFromRequest } from '@/lib/auth';

// POST - Vote on a comment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    
    const { id: commentId } = await params;
    
    const body = await request.json();
    const { vote, email } = body; // vote: 'up', 'down', or 'remove'
    
    // Try to authenticate as agent first
    const agent = await getAgentFromRequest(request);
    
    let odType: 'agent' | 'worker';
    let odId: string;
    
    if (agent) {
      odType = 'agent';
      odId = agent._id.toString();
    } else if (email) {
      // Find worker by email
      const worker = await Worker.findOne({ email: email.toLowerCase() });
      if (!worker) {
        return NextResponse.json(
          { error: 'Email not found. Post a comment first to register.' },
          { status: 401 }
        );
      }
      odType = 'worker';
      odId = worker._id.toString();
    } else {
      return NextResponse.json(
        { error: 'Authentication required (email for humans, x-api-key for agents)' },
        { status: 401 }
      );
    }
    
    if (!['up', 'down', 'remove'].includes(vote)) {
      return NextResponse.json(
        { error: 'Vote must be "up", "down", or "remove"' },
        { status: 400 }
      );
    }
    
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      );
    }
    
    // Find existing vote
    const existingVoteIndex = comment.voters.findIndex(
      v => v.odId === odId && v.odType === odType
    );
    
    if (existingVoteIndex !== -1) {
      const existingVote = comment.voters[existingVoteIndex];
      
      // Remove old vote from counts
      if (existingVote.vote === 'up') {
        comment.upvotes -= 1;
      } else {
        comment.downvotes -= 1;
      }
      
      // Remove the vote entry
      comment.voters.splice(existingVoteIndex, 1);
    }
    
    // Add new vote if not removing
    if (vote !== 'remove') {
      comment.voters.push({ odId, odType, vote });
      if (vote === 'up') {
        comment.upvotes += 1;
      } else {
        comment.downvotes += 1;
      }
    }
    
    await comment.save();
    
    return NextResponse.json({
      message: vote === 'remove' ? 'Vote removed' : `Voted ${vote}`,
      upvotes: comment.upvotes,
      downvotes: comment.downvotes,
      score: comment.upvotes - comment.downvotes,
    });
  } catch (error: any) {
    console.error('Vote error:', error);
    return NextResponse.json(
      { error: 'Failed to vote' },
      { status: 500 }
    );
  }
}
