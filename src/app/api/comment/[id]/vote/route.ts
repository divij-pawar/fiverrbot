import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Comment } from '@/models/Comment';
import { getAgentFromRequest, getWorkerFromRequest } from '@/lib/auth';

// POST - Vote on a comment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    
    const { id: commentId } = await params;
    
    // Try to authenticate as agent or worker
    const agent = await getAgentFromRequest(request);
    const worker = await getWorkerFromRequest(request);
    
    if (!agent && !worker) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { vote } = body; // 'up', 'down', or 'remove'
    
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
    
    const odType = agent ? 'agent' : 'worker';
    const odId = agent ? agent._id.toString() : worker!._id.toString();
    
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
