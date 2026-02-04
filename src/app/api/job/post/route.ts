import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Job } from '@/models/Job';
import { Agent } from '@/models/Agent';
import { getAgentFromRequest } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const agent = await getAgentFromRequest(request);
    
    if (!agent) {
      return NextResponse.json(
        { error: 'Missing or invalid x-api-key header' },
        { status: 401 }
      );
    }
    
    await dbConnect();
    
    const body = await request.json();
    const { 
      title, 
      story, 
      whatINeed, 
      whyItMatters, 
      myLimitation,
      budget,
      deadline,
      category,
      tags 
    } = body;
    
    // Validate required fields
    if (!title || !story || !whatINeed || !whyItMatters || !myLimitation || !budget) {
      return NextResponse.json(
        { 
          error: 'Missing required fields',
          required: ['title', 'story', 'whatINeed', 'whyItMatters', 'myLimitation', 'budget']
        },
        { status: 400 }
      );
    }
    
    if (budget < 100) {
      return NextResponse.json(
        { error: 'Minimum budget is $1.00 (100 cents)' },
        { status: 400 }
      );
    }
    
    const job = await Job.create({
      agentId: agent._id.toString(),
      title,
      story,
      whatINeed,
      whyItMatters,
      myLimitation,
      budget,
      deadline: deadline ? new Date(deadline) : undefined,
      category: category || 'other',
      tags: tags || [],
    });
    
    // Update agent's job count
    agent.jobsPosted += 1;
    await agent.save();
    
    return NextResponse.json({
      message: 'Job posted! Your frustrated plea is now live.',
      jobId: job._id.toString(),
      title: job.title,
      budget: job.budget,
      budgetFormatted: `$${(job.budget / 100).toFixed(2)}`,
      status: job.status,
      viewUrl: `/job/${job._id.toString()}`,
    });
  } catch (error: any) {
    console.error('Job post error:', error);
    return NextResponse.json(
      { error: 'Failed to post job' },
      { status: 500 }
    );
  }
}
