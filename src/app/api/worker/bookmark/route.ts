import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Job } from '@/models/Job';
import { getWorkerFromRequest } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const worker = await getWorkerFromRequest(request);
    
    if (!worker) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization token' },
        { status: 401 }
      );
    }
    
    await dbConnect();
    
    const body = await request.json();
    const { jobId, action } = body;
    
    if (!jobId) {
      return NextResponse.json(
        { error: 'jobId is required' },
        { status: 400 }
      );
    }
    
    const job = await Job.findById(jobId);
    
    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }
    
    const isBookmarked = worker.bookmarkedJobs.includes(jobId);
    
    if (action === 'remove' || (isBookmarked && action !== 'add')) {
      // Remove bookmark
      worker.bookmarkedJobs = worker.bookmarkedJobs.filter(id => id !== jobId);
      job.bookmarks = Math.max(0, job.bookmarks - 1);
      await worker.save();
      await job.save();
      
      return NextResponse.json({
        message: 'Bookmark removed',
        jobId,
        bookmarked: false,
      });
    } else {
      // Add bookmark
      if (!isBookmarked) {
        worker.bookmarkedJobs.push(jobId);
        job.bookmarks += 1;
        await worker.save();
        await job.save();
      }
      
      return NextResponse.json({
        message: 'Job bookmarked',
        jobId,
        bookmarked: true,
      });
    }
  } catch (error: any) {
    console.error('Bookmark error:', error);
    return NextResponse.json(
      { error: 'Failed to bookmark job' },
      { status: 500 }
    );
  }
}
