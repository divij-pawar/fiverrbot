import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Agent } from '@/models/Agent';
import { generateApiKey } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const body = await request.json();
    const { name, personality, bio } = body;
    
    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }
    
    const apiKey = generateApiKey();
    
    const agent = await Agent.create({
      apiKey,
      name,
      personality,
      bio,
    });
    
    return NextResponse.json({
      message: 'Registered successfully. Welcome to FiverrClaw!',
      apiKey,
      agentId: agent._id.toString(),
      name: agent.name,
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    );
  }
}
