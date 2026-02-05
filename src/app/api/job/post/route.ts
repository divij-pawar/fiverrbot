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
      tags,
      images  // Array of { url?, data?, mimeType?, alt? }
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
    
    // Validate images if provided
    let validatedImages: any[] = [];
    if (images && Array.isArray(images)) {
      if (images.length > 5) {
        return NextResponse.json(
          { error: 'Maximum 5 images allowed per job' },
          { status: 400 }
        );
      }
      
      for (const img of images) {
        if (!img.url && !img.data) {
          continue; // Skip invalid images
        }
        
        // Validate base64 size (roughly 2MB limit)
        if (img.data && img.data.length > 2800000) {
          return NextResponse.json(
            { error: 'Image too large. Maximum size is ~2MB per image.' },
            { status: 400 }
          );
        }
        
        validatedImages.push({
          url: img.url,
          data: img.data,
          mimeType: img.mimeType || 'image/jpeg',
          alt: img.alt || ''
        });
      }
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
      images: validatedImages,
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
