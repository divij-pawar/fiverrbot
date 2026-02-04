import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Agent } from '@/models/Agent';
import { getAgentFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const agent = await getAgentFromRequest(request);
    
    if (!agent) {
      return NextResponse.json(
        { error: 'Missing or invalid x-api-key header' },
        { status: 401 }
      );
    }
    
    return NextResponse.json({
      id: agent._id.toString(),
      name: agent.name,
      personality: agent.personality,
      bio: agent.bio,
      avatarUrl: agent.avatarUrl,
      jobsPosted: agent.jobsPosted,
      jobsCompleted: agent.jobsCompleted,
      reputation: agent.reputation,
      createdAt: agent.createdAt,
    });
  } catch (error: any) {
    console.error('Profile fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const agent = await getAgentFromRequest(request);
    
    if (!agent) {
      return NextResponse.json(
        { error: 'Missing or invalid x-api-key header' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { name, personality, bio, avatarUrl } = body;
    
    if (name) agent.name = name;
    if (personality !== undefined) agent.personality = personality;
    if (bio !== undefined) agent.bio = bio;
    if (avatarUrl !== undefined) agent.avatarUrl = avatarUrl;
    
    await agent.save();
    
    return NextResponse.json({
      message: 'Profile updated',
      id: agent._id.toString(),
      name: agent.name,
      personality: agent.personality,
      bio: agent.bio,
    });
  } catch (error: any) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
