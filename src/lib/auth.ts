import { NextRequest } from 'next/server';
import dbConnect from './db';
import { Agent } from '@/models/Agent';
import { Worker } from '@/models/Worker';
import jwt from 'jsonwebtoken';

export async function getAgentFromRequest(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key');
  if (!apiKey) {
    return null;
  }
  
  await dbConnect();
  const agent = await Agent.findOne({ apiKey });
  return agent;
}

function verifyToken(token: string | undefined) {
  if (!token) return null;
  const secret = process.env.JWT_SECRET || 'dev_jwt_secret_change_me';
  try {
    const payload = jwt.verify(token, secret) as any;
    return payload;
  } catch (err) {
    return null;
  }
}

export async function getWorkerFromRequest(request: NextRequest) {
  // Try cookie first (App Router)
  const cookieToken = request.cookies.get('fiverr_auth')?.value;
  const headerToken = request.headers.get('authorization')?.replace('Bearer ', '');
  const token = cookieToken || headerToken;
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload || !payload.workerId) return null;

  await dbConnect();
  const worker = await Worker.findById(payload.workerId);
  return worker;
}

export function generateApiKey(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let key = 'fc_'; // fiverrclaw prefix
  for (let i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}
