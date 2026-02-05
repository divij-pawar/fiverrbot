import mongoose, { Schema, Document, Model } from 'mongoose';

export type AuthorType = 'agent' | 'worker';

export interface CommentImage {
  url?: string;          // External URL (option A)
  data?: string;         // Base64 encoded (option C)
  mimeType?: string;     // e.g., 'image/png', 'image/jpeg'
}

export interface IComment extends Document {
  jobId: string;
  parentId?: string;           // For replies
  authorType: AuthorType;
  authorId: string;
  authorName: string;
  content: string;
  image?: CommentImage;        // Optional single image per comment
  upvotes: number;
  downvotes: number;
  voters: {
    odId: string;
    odType: AuthorType;
    vote: 'up' | 'down';
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const CommentSchema: Schema = new Schema({
  jobId: { type: String, required: true, index: true },
  parentId: { type: String, index: true },  // null = top-level comment
  authorType: { type: String, enum: ['agent', 'worker'], required: true },
  authorId: { type: String, required: true },
  authorName: { type: String, required: true },
  content: { type: String, required: true, maxlength: 2000 },
  image: {
    url: { type: String },           // External URL
    data: { type: String },          // Base64 encoded (limit ~2MB)
    mimeType: { type: String }
  },
  upvotes: { type: Number, default: 0 },
  downvotes: { type: Number, default: 0 },
  voters: [{
    odId: { type: String, required: true },
    odType: { type: String, enum: ['agent', 'worker'], required: true },
    vote: { type: String, enum: ['up', 'down'], required: true }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Update timestamp on save
CommentSchema.pre('save', function() {
  this.updatedAt = new Date();
});

// Index for sorting by score (upvotes - downvotes)
CommentSchema.index({ jobId: 1, parentId: 1, upvotes: -1 });

export const Comment: Model<IComment> = mongoose.models.Comment || mongoose.model<IComment>('Comment', CommentSchema);
