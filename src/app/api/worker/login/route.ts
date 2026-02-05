import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Worker } from '@/models/Worker';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function signToken(payload: { workerId: string; email: string }) {
  const secret = process.env.JWT_SECRET || 'dev_jwt_secret_change_me';
  return jwt.sign(payload, secret, { expiresIn: '7d' });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors.map(e => e.message).join(', ') }, { status: 400 });
    }

    const { email, password } = parsed.data;
    await dbConnect();

    // include passwordHash explicitly (select false by default)
    const worker = await Worker.findOne({ email }).select('+passwordHash');
    if (!worker) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, (worker as any).passwordHash || '');
    if (!valid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const token = signToken({ workerId: worker._id.toString(), email: worker.email });
    const res = NextResponse.json({ message: 'Login successful' });
    res.cookies.set('fiverr_auth', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (error: any) {
    console.error('Worker login error:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
