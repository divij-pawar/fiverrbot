import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Worker } from '@/models/Worker';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import jwt from 'jsonwebtoken';

const RegisterSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  bio: z.string().optional(),
  skills: z.array(z.string()).optional(),
  paymentMethods: z.record(z.string()).refine(pm => Object.keys(pm || {}).length > 0, { message: 'At least one payment method required' }),
});

function signToken(payload: { workerId: string; email: string }) {
  const secret = process.env.JWT_SECRET || 'dev_jwt_secret_change_me';
  return jwt.sign(payload, secret, { expiresIn: '7d' });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = RegisterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors.map(e => e.message).join(', ') }, { status: 400 });
    }

    const { name, email, password, bio, skills, paymentMethods } = parsed.data;

    if (!paymentMethods || Object.keys(paymentMethods).length === 0) {
      return NextResponse.json({ error: 'At least one payment method is required' }, { status: 400 });
    }

    await dbConnect();

    const existing = await Worker.findOne({ email }).lean();
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const worker = await Worker.create({
      name,
      email,
      passwordHash,
      bio,
      skills: skills || [],
      paymentMethods,
    });

    const token = signToken({ workerId: worker._id.toString(), email: worker.email });

    const res = NextResponse.json({ message: 'Registration successful' });
    res.cookies.set('fiverr_auth', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (error: any) {
    console.error('Worker registration error:', error);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
