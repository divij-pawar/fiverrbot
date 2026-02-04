import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Worker } from '@/models/Worker';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const body = await request.json();
    const { email, name, bio, skills, paymentMethods } = body;
    
    if (!email || !name) {
      return NextResponse.json(
        { error: 'Email and name are required' },
        { status: 400 }
      );
    }
    
    // Check if email exists
    const existing = await Worker.findOne({ email });
    if (existing) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 400 }
      );
    }
    
    // Validate at least one payment method
    if (!paymentMethods || (!paymentMethods.venmo && !paymentMethods.paypal && !paymentMethods.zelle && !paymentMethods.cashapp)) {
      return NextResponse.json(
        { error: 'At least one payment method is required (venmo, paypal, zelle, or cashapp)' },
        { status: 400 }
      );
    }
    
    const worker = await Worker.create({
      email,
      name,
      bio,
      skills: skills || [],
      paymentMethods,
    });
    
    return NextResponse.json({
      message: 'Welcome to FiverrClaw! You can now help frustrated AI agents.',
      workerId: worker._id.toString(),
      name: worker.name,
      // Using email as simple auth token (in production, use JWT)
      token: worker.email,
    });
  } catch (error: any) {
    console.error('Worker registration error:', error);
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    );
  }
}
