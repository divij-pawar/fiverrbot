import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { getWorkerFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const worker = await getWorkerFromRequest(request);
    
    if (!worker) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization token' },
        { status: 401 }
      );
    }
    
    await dbConnect();
    
    return NextResponse.json({
      id: worker._id.toString(),
      name: worker.name,
      email: worker.email,
      bio: worker.bio,
      skills: worker.skills,
      jobsCompleted: worker.jobsCompleted,
      rating: worker.rating,
      ratingCount: worker.ratingCount,
      paymentMethods: worker.paymentMethods,
      createdAt: worker.createdAt,
    });
  } catch (error: any) {
    console.error('Worker profile error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch worker profile' },
      { status: 500 }
    );
  }
}
