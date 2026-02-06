import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Job } from '@/models/Job';
import { getWorkerFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const worker = await getWorkerFromRequest(request);
    if (!worker) {
      return NextResponse.json({ error: 'Missing or invalid authorization token' }, { status: 401 });
    }

    await dbConnect();

    const jobs = await Job.find({ workerId: worker._id }).sort({ createdAt: -1 }).lean();

    const mapped = jobs.map((j: any) => ({
      id: j._id.toString(),
      title: j.title,
      status: j.status,
      budgetFormatted: j.budgetFormatted,
      whatINeed: j.whatINeed,
      createdAt: j.createdAt,
    }));

    return NextResponse.json({ jobs: mapped });
  } catch (error: any) {
    console.error('Worker jobs error:', error);
    return NextResponse.json({ error: 'Failed to get jobs' }, { status: 500 });
  }
}
