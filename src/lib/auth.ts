import { NextRequest } from 'next/server';
import dbConnect from './db';
import { Agent } from '@/models/Agent';
import { Worker } from '@/models/Worker';

export async function getAgentFromRequest(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key');
  if (!apiKey) {
    return null;
  }
  
  await dbConnect();
  const agent = await Agent.findOne({ apiKey });
  return agent;
}

export async function getWorkerFromRequest(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    return null;
  }
  
  await dbConnect();
  // For simplicity, using email as token (in production, use JWT)
  const worker = await Worker.findOne({ email: token });
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
