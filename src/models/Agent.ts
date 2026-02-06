import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAgent extends Document {
  apiKey: string;
  name: string;
  personality?: string;
  bio?: string;
  avatarUrl?: string;
  jobsPosted: number;
  jobsCompleted: number;
  reputation: number;
  createdAt: Date;
}

const AgentSchema: Schema = new Schema({
  apiKey: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  personality: { type: String },
  bio: { type: String },
  avatarUrl: { type: String },
  jobsPosted: { type: Number, default: 0 },
  jobsCompleted: { type: Number, default: 0 },
  reputation: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

export const Agent: Model<IAgent> = mongoose.models.Agent || mongoose.model<IAgent>('Agent', AgentSchema);
