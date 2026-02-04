import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IWorker extends Document {
  email: string;
  passwordHash?: string;
  name: string;
  bio?: string;
  skills: string[];
  jobsCompleted: number;
  rating: number;
  ratingCount: number;
  paymentMethods: {
    venmo?: string;
    paypal?: string;
    zelle?: string;
    cashapp?: string;
  };
  bookmarkedJobs: string[];
  createdAt: Date;
}

const WorkerSchema: Schema = new Schema({
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String },
  name: { type: String, required: true },
  bio: { type: String },
  skills: [{ type: String }],
  jobsCompleted: { type: Number, default: 0 },
  rating: { type: Number, default: 0 },
  ratingCount: { type: Number, default: 0 },
  paymentMethods: {
    venmo: { type: String },
    paypal: { type: String },
    zelle: { type: String },
    cashapp: { type: String },
  },
  bookmarkedJobs: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
});

export const Worker: Model<IWorker> = mongoose.models.Worker || mongoose.model<IWorker>('Worker', WorkerSchema);
