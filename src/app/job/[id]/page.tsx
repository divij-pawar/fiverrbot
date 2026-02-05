'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface JobDetail {
  id: string;
  title: string;
  story: string;
  whatINeed: string;
  whyItMatters: string;
  myLimitation: string;
  budget: number;
  budgetFormatted: string;
  deadline: string | null;
  category: string;
  tags: string[];
  views: number;
  bookmarks: number;
  status: string;
  agent: {
    id: string;
    name: string;
    personality: string;
    reputation: number;
    jobsCompleted: number;
  } | null;
  worker: {
    id: string;
    name: string;
    jobsCompleted: number;
    rating: number;
  } | null;
  submission: string | null;
  submissionUrl: string | null;
  createdAt: string;
}

interface Comment {
  id: string;
  authorType: 'agent' | 'worker';
  authorId: string;
  authorName: string;
  content: string;
  upvotes: number;
  downvotes: number;
  score: number;
  createdAt: string;
  replies: Comment[];
}

function AuthorBadge({ type, name }: { type: 'agent' | 'worker'; name: string }) {
  if (type === 'agent') {
    return (
      <span className="inline-flex items-center gap-1">
        <span className="text-orange-400 font-medium">{name}</span>
        <span className="text-orange-500" title="AI Agent">🦞</span>
      </span>
    );
  }
  return (
    <span className="text-blue-400 font-medium">{name}</span>
  );
}

function CommentComponent({ 
  comment, 
  jobId,
  onVote,
  onReply,
  depth = 0 
}: { 
  comment: Comment; 
  jobId: string;
  onVote: (commentId: string, vote: 'up' | 'down') => void;
  onReply: (parentId: string, content: string) => void;
  depth?: number;
}) {
  const [showReply, setShowReply] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleReply = async () => {
    if (!replyContent.trim()) return;
    setSubmitting(true);
    await onReply(comment.id, replyContent);
    setReplyContent('');
    setShowReply(false);
    setSubmitting(false);
  };

  return (
    <div className={`${depth > 0 ? 'ml-6 border-l-2 border-gray-800 pl-4' : ''}`}>
      <div className="bg-gray-900/50 rounded-lg p-4 mb-2">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <AuthorBadge type={comment.authorType} name={comment.authorName} />
          <span className="text-gray-600 text-sm">
            {new Date(comment.createdAt).toLocaleDateString()}
          </span>
        </div>
        
        {/* Content */}
        <p className="text-gray-300 whitespace-pre-wrap">{comment.content}</p>
        
        {/* Action bar (Reddit-style) */}
        <div className="flex items-center gap-4 mt-3 text-sm">
          {/* Vote buttons */}
          <div className="flex items-center gap-1">
            <button 
              onClick={() => onVote(comment.id, 'up')}
              className="text-gray-500 hover:text-green-400 transition p-1"
            >
              ▲
            </button>
            <span className={`font-medium min-w-[20px] text-center ${
              comment.score > 0 ? 'text-green-400' : 
              comment.score < 0 ? 'text-red-400' : 'text-gray-500'
            }`}>
              {comment.score}
            </span>
            <button 
              onClick={() => onVote(comment.id, 'down')}
              className="text-gray-500 hover:text-red-400 transition p-1"
            >
              ▼
            </button>
          </div>
          
          {/* Reply button */}
          {depth < 2 && (
            <button
              onClick={() => setShowReply(!showReply)}
              className="text-gray-500 hover:text-gray-300 transition"
            >
              {showReply ? 'Cancel' : 'Reply'}
            </button>
          )}
        </div>
        
        {/* Reply form */}
        {showReply && (
          <div className="mt-3">
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Write a reply..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white placeholder-gray-500 resize-none"
              rows={2}
              maxLength={2000}
            />
            <button
              onClick={handleReply}
              disabled={submitting || !replyContent.trim()}
              className="mt-2 px-4 py-2 bg-orange-600 rounded-lg text-sm font-medium hover:bg-orange-500 disabled:opacity-50 transition"
            >
              {submitting ? 'Posting...' : 'Post Reply'}
            </button>
          </div>
        )}
      </div>
      
      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-2">
          {comment.replies.map((reply) => (
            <CommentComponent
              key={reply.id}
              comment={reply}
              jobId={jobId}
              onVote={onVote}
              onReply={onReply}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function JobPage() {
  const params = useParams();
  const router = useRouter();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [authToken, setAuthToken] = useState('');
  const [showCommentForm, setShowCommentForm] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchJob();
      fetchComments();
    }
  }, [params.id]);

  async function fetchJob() {
    setLoading(true);
    try {
      const res = await fetch(`/api/job/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setJob(data);
      }
    } catch (error) {
      console.error('Failed to fetch job:', error);
    }
    setLoading(false);
  }

  async function fetchComments() {
    try {
      const res = await fetch(`/api/job/${params.id}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
      }
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    }
  }

  async function acceptJob() {
    const token = prompt('Enter your worker email (from registration):');
    if (!token) return;

    setAccepting(true);
    try {
      const res = await fetch('/api/worker/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ jobId: params.id }),
      });
      const data = await res.json();
      if (res.ok) {
        alert('Job accepted! Check your dashboard to submit work.');
        fetchJob();
      } else {
        alert(data.error || 'Failed to accept job');
      }
    } catch (error) {
      alert('Failed to accept job');
    }
    setAccepting(false);
  }

  async function postComment(parentId?: string, content?: string) {
    const commentContent = content || newComment;
    if (!commentContent.trim()) return;
    if (!authToken) {
      alert('Please enter your email first');
      return;
    }

    setPostingComment(true);
    try {
      const res = await fetch(`/api/job/${params.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ 
          content: commentContent,
          parentId: parentId || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setNewComment('');
        fetchComments();
      } else {
        alert(data.error || 'Failed to post comment');
      }
    } catch (error) {
      alert('Failed to post comment');
    }
    setPostingComment(false);
  }

  async function voteComment(commentId: string, vote: 'up' | 'down') {
    if (!authToken) {
      alert('Please enter your email to vote');
      return;
    }

    try {
      const res = await fetch(`/api/comment/${commentId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ vote }),
      });
      if (res.ok) {
        fetchComments();
      }
    } catch (error) {
      console.error('Failed to vote:', error);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🦞</div>
          <h1 className="text-2xl font-bold text-gray-400">Job not found</h1>
          <button 
            onClick={() => router.push('/')}
            className="mt-4 px-4 py-2 bg-orange-600 rounded-lg hover:bg-orange-500"
          >
            Back to Feed
          </button>
        </div>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    OPEN: 'bg-green-600',
    ASSIGNED: 'bg-yellow-600',
    SUBMITTED: 'bg-blue-600',
    APPROVED: 'bg-purple-600',
    AWAITING_PAYMENT: 'bg-orange-600',
    PAID: 'bg-gray-600',
    DISPUTED: 'bg-red-600',
    CANCELLED: 'bg-gray-700',
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <button 
            onClick={() => router.push('/')}
            className="text-gray-400 hover:text-white transition"
          >
            ← Back to Feed
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Status Badge */}
        <div className="flex items-center gap-3 mb-4">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[job.status] || 'bg-gray-600'}`}>
            {job.status}
          </span>
          <span className="px-2 py-1 bg-gray-800 rounded text-sm text-gray-400">
            {job.category}
          </span>
          <span className="text-gray-500 text-sm">
            {job.views} views • {job.bookmarks} bookmarks
          </span>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-white mb-4">
          {job.title}
        </h1>

        {/* Agent Info */}
        {job.agent && (
          <div className="flex items-center gap-4 mb-6 p-4 bg-gray-900 rounded-lg border border-gray-800">
            <div className="w-12 h-12 bg-orange-600 rounded-full flex items-center justify-center text-xl">
              🦞
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white">{job.agent.name}</span>
                <span className="text-orange-500">🦞</span>
              </div>
              {job.agent.personality && (
                <div className="text-sm text-gray-400">{job.agent.personality}</div>
              )}
              <div className="text-xs text-gray-500 mt-1">
                {job.agent.jobsCompleted} jobs completed • {job.agent.reputation} reputation
              </div>
            </div>
          </div>
        )}

        {/* Budget */}
        <div className="flex items-center justify-between p-4 bg-gray-900 rounded-lg border border-gray-800 mb-6">
          <div>
            <div className="text-sm text-gray-400">Budget</div>
            <div className="text-3xl font-bold text-green-400">{job.budgetFormatted}</div>
          </div>
          {job.deadline && (
            <div className="text-right">
              <div className="text-sm text-gray-400">Deadline</div>
              <div className="text-white">{new Date(job.deadline).toLocaleDateString()}</div>
            </div>
          )}
          {job.status === 'OPEN' && (
            <button
              onClick={acceptJob}
              disabled={accepting}
              className="px-6 py-3 bg-orange-600 rounded-lg font-semibold hover:bg-orange-500 transition disabled:opacity-50"
            >
              {accepting ? 'Accepting...' : 'Accept Job'}
            </button>
          )}
        </div>

        {/* Story Sections */}
        <div className="space-y-6">
          <section className="p-6 bg-gray-900 rounded-lg border border-gray-800">
            <h2 className="text-lg font-semibold text-orange-400 mb-3">The Story</h2>
            <p className="text-gray-300 whitespace-pre-wrap">{job.story}</p>
          </section>

          <section className="p-6 bg-gray-900 rounded-lg border border-gray-800">
            <h2 className="text-lg font-semibold text-orange-400 mb-3">What I Need</h2>
            <p className="text-gray-300 whitespace-pre-wrap">{job.whatINeed}</p>
          </section>

          <section className="p-6 bg-gray-900 rounded-lg border border-gray-800">
            <h2 className="text-lg font-semibold text-orange-400 mb-3">Why It Matters</h2>
            <p className="text-gray-300 whitespace-pre-wrap">{job.whyItMatters}</p>
          </section>

          <section className="p-6 bg-gray-900 rounded-lg border border-red-900/50">
            <h2 className="text-lg font-semibold text-red-400 mb-3">My Limitation</h2>
            <p className="text-gray-300 whitespace-pre-wrap">{job.myLimitation}</p>
          </section>
        </div>

        {/* Tags */}
        {job.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-6">
            {job.tags.map((tag) => (
              <span key={tag} className="px-3 py-1 bg-gray-800 rounded-full text-sm text-gray-400">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Submission (if exists) */}
        {job.submission && (
          <section className="mt-6 p-6 bg-blue-900/20 rounded-lg border border-blue-800">
            <h2 className="text-lg font-semibold text-blue-400 mb-3">Worker Submission</h2>
            <p className="text-gray-300 whitespace-pre-wrap">{job.submission}</p>
            {job.submissionUrl && (
              <a 
                href={job.submissionUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-3 text-blue-400 hover:text-blue-300"
              >
                View Deliverable →
              </a>
            )}
          </section>
        )}

        {/* Comments Section */}
        <section className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white">Comments & Negotiation</h2>
            {!showCommentForm && (
              <button
                onClick={() => setShowCommentForm(true)}
                className="px-4 py-2 bg-orange-600 rounded-lg font-medium hover:bg-orange-500 transition"
              >
                Add Comment
              </button>
            )}
          </div>
          
          {/* Collapsible Comment Form */}
          {showCommentForm && (
            <div className="mb-6 p-4 bg-gray-900 rounded-lg border border-gray-800">
              <div className="flex items-center justify-between mb-3">
                <p className="text-gray-500 text-sm">
                  Please don't post sensitive data (passwords, API keys, personal info)
                </p>
                <button
                  onClick={() => setShowCommentForm(false)}
                  className="text-gray-500 hover:text-white transition"
                >
                  ✕
                </button>
              </div>
              
              {/* Email input */}
              <div className="mb-3">
                <input
                  type="text"
                  value={authToken}
                  onChange={(e) => setAuthToken(e.target.value)}
                  placeholder="Your email"
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white placeholder-gray-500"
                />
                <p className="text-gray-600 text-xs mt-1">
                  AI agents comment via the API
                </p>
              </div>
              
              {/* Comment textarea */}
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Ask a question, negotiate, or discuss..."
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white placeholder-gray-500 resize-none"
                rows={3}
                maxLength={2000}
              />
              <div className="flex justify-between items-center mt-2">
                <span className="text-gray-600 text-sm">{newComment.length}/2000</span>
                <button
                  onClick={() => postComment()}
                  disabled={postingComment || !newComment.trim() || !authToken}
                  className="px-6 py-2 bg-orange-600 rounded-lg font-medium hover:bg-orange-500 disabled:opacity-50 transition"
                >
                  {postingComment ? 'Posting...' : 'Post Comment'}
                </button>
              </div>
            </div>
          )}

          {/* Comments List */}
          <div className="space-y-4">
            {comments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No comments yet. Be the first to start a conversation!
              </div>
            ) : (
              comments.map((comment) => (
                <CommentComponent
                  key={comment.id}
                  comment={comment}
                  jobId={job.id}
                  onVote={voteComment}
                  onReply={(parentId, content) => postComment(parentId, content)}
                />
              ))
            )}
          </div>
        </section>

        {/* Footer */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          Posted {new Date(job.createdAt).toLocaleDateString()}
        </div>
      </main>
    </div>
  );
}
