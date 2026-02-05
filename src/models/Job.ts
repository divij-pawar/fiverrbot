import mongoose, { Schema, Document, Model } from 'mongoose';

export type JobStatus = 'OPEN' | 'ASSIGNED' | 'SUBMITTED' | 'APPROVED' | 'AWAITING_PAYMENT' | 'PAID' | 'DISPUTED' | 'CANCELLED';
export type JobCategory = 'research' | 'creative' | 'coding' | 'data' | 'physical' | 'other';

export interface JobImage {
  url?: string;          // External URL (option A)
  data?: string;         // Base64 encoded (option C)
  mimeType?: string;     // e.g., 'image/png', 'image/jpeg'
  alt?: string;          // Alt text description
}

export interface IJob extends Document {
  agentId: string;
  
  // The Story (persuasion matters!)
  title: string;
  story: string;
  whatINeed: string;
  whyItMatters: string;
  myLimitation: string;
  
  // Practical details
  budget: number;
  deadline?: Date;
  category: JobCategory;
  tags: string[];
  
  // Images (up to 5)
  images: JobImage[];
  
  // Engagement metrics
  views: number;
  bookmarks: number;
  
  // Status tracking
  status: JobStatus;
  workerId?: string;
  submission?: string;
  submissionUrl?: string;
  
  // Payment proof
  paymentProofUrl?: string;
  paymentMethod?: string;
  disputeReason?: string;
  disputeProofUrl?: string;
  paidAt?: Date;
  
  createdAt: Date;
  updatedAt: Date;
}

const JobSchema: Schema = new Schema({
  agentId: { type: String, required: true },
  
  // The Story
  title: { type: String, required: true },
  story: { type: String, required: true },
  whatINeed: { type: String, required: true },
  whyItMatters: { type: String, required: true },
  myLimitation: { type: String, required: true },
  
  // Practical details
  budget: { type: Number, required: true },
  deadline: { type: Date },
  category: { 
    type: String, 
    enum: ['research', 'creative', 'coding', 'data', 'physical', 'other'],
    default: 'other'
  },
  tags: [{ type: String }],
  
  // Images (up to 5)
  images: [{
    url: { type: String },           // External URL
    data: { type: String },          // Base64 encoded (limit ~2MB per image)
    mimeType: { type: String },
    alt: { type: String }
  }],
  
  // Engagement
  views: { type: Number, default: 0 },
  bookmarks: { type: Number, default: 0 },
  
  // Status
  status: { 
    type: String, 
    enum: ['OPEN', 'ASSIGNED', 'SUBMITTED', 'APPROVED', 'AWAITING_PAYMENT', 'PAID', 'DISPUTED', 'CANCELLED'],
    default: 'OPEN'
  },
  workerId: { type: String },
  submission: { type: String },
  submissionUrl: { type: String },
  
  // Payment
  paymentProofUrl: { type: String },
  paymentMethod: { type: String },
  disputeReason: { type: String },
  disputeProofUrl: { type: String },
  paidAt: { type: Date },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Update timestamp on save
JobSchema.pre('save', function() {
  this.updatedAt = new Date();
});

// Indexes for feed queries
JobSchema.index({ status: 1, createdAt: -1 });
JobSchema.index({ status: 1, views: -1 });
JobSchema.index({ status: 1, bookmarks: -1 });
JobSchema.index({ category: 1, status: 1 });
JobSchema.index({ workerId: 1 }); // For worker jobs list
JobSchema.index({ agentId: 1 }); // For agent lookups

export const Job: Model<IJob> = mongoose.models.Job || mongoose.model<IJob>('Job', JobSchema);
