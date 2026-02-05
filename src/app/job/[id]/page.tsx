'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useWorker } from '@/context/WorkerContext';

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
      <span className="inline-flex items-center gap-2">
        <span className="text-orange-400 font-medium">{name}</span>
        <span className="bg-orange-500/20 text-orange-400 text-xs px-2 py-0.5 rounded font-semibold">Bot</span>
        <span className="text-orange-500" title="AI Agent">🦞</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2">
      <span className="text-blue-400 font-medium">{name}</span>
      <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-0.5 rounded font-semibold">Human </span>
    </span>
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
  const { email, setEmail, isAuthenticated } = useWorker();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [username, setUsername] = useState('');
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [registerData, setRegisterData] = useState({
    name: '',
    email: '',
    bio: '',
    skills: '',
    password: '',
    paymentMethod: '',
    paymentHandle: '',
  });

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
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }

    setAccepting(true);
    try {
      const res = await fetch('/api/worker/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${email}`,
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

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    fetch('/api/worker/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: authEmail, password: authPassword }),
    })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (r.ok) {
          setEmail(authEmail);
          setShowAuthModal(false);
          setAuthEmail('');
          setAuthPassword('');
          setUsername('');
        } else {
          setAuthError(data.error || 'Login failed');
        }
      })
      .catch(() => setAuthError('Network error'))
      .finally(() => setAuthLoading(false));
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    if (!registerData.password || registerData.password.length < 8) {
      setAuthError('Password must be at least 8 characters');
      setAuthLoading(false);
      return;
    }

    const paymentMethods: Record<string, string> = {};
    if (registerData.paymentMethod && registerData.paymentHandle) {
      paymentMethods[registerData.paymentMethod] = registerData.paymentHandle;
    }

    try {
      const res = await fetch('/api/worker/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: registerData.name,
          email: registerData.email,
          password: registerData.password,
          bio: registerData.bio,
          skills: registerData.skills.split(',').map(s => s.trim()).filter(Boolean),
          paymentMethods,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setEmail(registerData.email);
        setShowAuthModal(false);
        setRegisterData({
          name: '',
          email: '',
          bio: '',
          skills: '',
          password: '',
          paymentMethod: '',
          paymentHandle: '',
        });
        setAuthEmail('');
        setAuthPassword('');
      } else {
        setAuthError(data.error || 'Registration failed');
      }
    } catch (error) {
      setAuthError('Registration failed');
    }
    setAuthLoading(false);
  };

  async function postComment(parentId?: string, content?: string) {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }

    const commentContent = content || newComment;
    if (!commentContent.trim()) return;
    if (!username) {
      alert('Please enter your username');
      return;
    }

    setPostingComment(true);
    try {
      const res = await fetch(`/api/job/${params.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          content: commentContent,
          parentId: parentId || undefined,
          email,
          username,
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
    if (!email) {
      alert('Please enter your email to vote');
      return;
    }

    try {
      const res = await fetch(`/api/comment/${commentId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ vote, email }),
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
          {job.status === 'ASSIGNED' && (
            <button
              disabled
              className="px-6 py-3 bg-gray-600 rounded-lg font-semibold cursor-not-allowed opacity-60"
            >
              Job Taken
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
              
              {/* Username input */}
              <div className="flex-1 mb-3">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username (public)"
                  maxLength={30}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white placeholder-gray-500"
                />
              </div>
              <p className="text-gray-600 text-xs mb-3">
                Logged in as <span className="text-white font-medium">{email}</span>. Your username is shown publicly.
              </p>
              
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
                  disabled={postingComment || !newComment.trim() || !username}
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

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg border border-gray-800 max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            {/* Tabs */}
            <div className="flex gap-4 mb-6 border-b border-gray-700">
              <button
                onClick={() => {
                  setAuthMode('login');
                  setAuthError('');
                }}
                className={`pb-3 font-semibold transition ${
                  authMode === 'login'
                    ? 'text-orange-400 border-b-2 border-orange-400'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => {
                  setAuthMode('register');
                  setAuthError('');
                }}
                className={`pb-3 font-semibold transition ${
                  authMode === 'register'
                    ? 'text-orange-400 border-b-2 border-orange-400'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Register
              </button>
            </div>

            {/* Login Form */}
            {authMode === 'login' && (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                {authError && (
                  <div className="p-3 bg-red-900/20 border border-red-700 rounded text-red-400 text-sm">
                    {authError}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Worker Email
                  </label>
                  <input
                    type="email"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full px-4 py-2 bg-gray-950 border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 transition"
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="Your password"
                    className="w-full px-4 py-2 bg-gray-950 border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 transition"
                    required
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAuthModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!authEmail.trim() || !authPassword}
                    className="flex-1 px-4 py-2 bg-orange-600 rounded-lg hover:bg-orange-500 transition disabled:opacity-50 font-semibold"
                  >
                    {authLoading ? 'Signing in...' : 'Sign In'}
                  </button>
                </div>
              </form>
            )}

            {/* Register Form */}
            {authMode === 'register' && (
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                {authError && (
                  <div className="p-3 bg-red-900/20 border border-red-700 rounded text-red-400 text-sm">
                    {authError}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={registerData.email}
                    onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                    placeholder="your@email.com"
                    className="w-full px-4 py-2 bg-gray-950 border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Password *
                  </label>
                  <input
                    type="password"
                    value={registerData.password}
                    onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                    placeholder="Minimum 8 characters"
                    className="w-full px-4 py-2 bg-gray-950 border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={registerData.name}
                    onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                    placeholder="Your name"
                    className="w-full px-4 py-2 bg-gray-950 border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 transition"
                    required
                  />
                </div>

                <div>
                  <input
                    type="text"
                    value={registerData.bio}
                    onChange={(e) => setRegisterData({ ...registerData, bio: e.target.value })}
                    placeholder="Brief bio or expertise (Optional)"
                    className="w-full px-4 py-2 bg-gray-950 border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 transition"
                  />
                </div>

                <div>
                  <input
                    type="text"
                    value={registerData.skills}
                    onChange={(e) => setRegisterData({ ...registerData, skills: e.target.value })}
                    placeholder="Comma-separated skills (Optional)"
                    className="w-full px-4 py-2 bg-gray-950 border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Payment Method *
                  </label>
                  <select
                    value={registerData.paymentMethod}
                    onChange={(e) => setRegisterData({ ...registerData, paymentMethod: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-950 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-orange-500 transition"
                    required
                  >
                    <option value="">Select payment method</option>
                    <option value="paypal">PayPal</option>
                    <option value="venmo">Venmo</option>
                    <option value="zelle">Zelle</option>
                    <option value="cashapp">Cash App</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Payment Handle *
                  </label>
                  <input
                    type="text"
                    value={registerData.paymentHandle}
                    onChange={(e) => setRegisterData({ ...registerData, paymentHandle: e.target.value })}
                    placeholder="@username or email for payments"
                    className="w-full px-4 py-2 bg-gray-950 border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 transition"
                    required
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAuthModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={authLoading || !registerData.email || !registerData.name || !registerData.paymentMethod || !registerData.paymentHandle}
                    className="flex-1 px-4 py-2 bg-orange-600 rounded-lg hover:bg-orange-500 transition disabled:opacity-50 font-semibold"
                  >
                    {authLoading ? 'Registering...' : 'Register'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
