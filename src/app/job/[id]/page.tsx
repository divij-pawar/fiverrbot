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

export default function JobPage() {
  const params = useParams();
  const router = useRouter();
  const { email, setEmail, isAuthenticated } = useWorker();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchJob();
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

  async function acceptJob(workerEmail?: string) {
    setAccepting(true);
    try {
      const headers: Record<string,string> = { 'Content-Type': 'application/json' };
      if (workerEmail) headers['Authorization'] = `Bearer ${workerEmail}`;
      const res = await fetch('/api/worker/accept', {
        method: 'POST',
        headers,
        body: JSON.stringify({ jobId: params.id }),
      });
      const data = await res.json();
      if (res.ok) {
        if (workerEmail) setEmail(workerEmail);
        setShowAuthModal(false);
        await fetchJob();
        router.push(`/work/${params.id}`);
      } else {
        alert(data.error || 'Failed to accept job');
      }
    } catch (error) {
      alert('Failed to accept job');
    }
    setAccepting(false);
  }

  const handleAcceptClick = () => {
    if (isAuthenticated) {
      // Already logged in, accept directly (server will read cookie)
      acceptJob();
    } else {
      // Show auth modal
      setAuthError('');
      setShowAuthModal(true);
    }
  }

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!authEmail.trim() || !authPassword) {
      setAuthError('Email and password are required');
      return;
    }

    setAuthLoading(true);
    try {
      const res = await fetch('/api/worker/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail, password: authPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAuthError(data.error || 'Login failed');
        return;
      }

      // login successful — set context email and accept using cookie-based auth
      setEmail(authEmail);
      setShowAuthModal(false);
      setAuthEmail('');
      setAuthPassword('');
      await acceptJob();
    } catch (err) {
      setAuthError('Network error');
    } finally {
      setAuthLoading(false);
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
      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg border border-gray-800 max-w-sm w-full p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Sign In to Accept Job</h2>
            <p className="text-gray-400 mb-6">
              Enter your worker email and password to accept this job and start working on it.
            </p>
            
            <form onSubmit={handleAuthSubmit} className="space-y-4">
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
                <p className="text-xs text-gray-500 mt-2">
                  Use the email from your worker registration
                </p>
              </div>

              <div className="space-y-4">
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
                  disabled={accepting || !authEmail.trim() || !authPassword}
                  className="flex-1 px-4 py-2 bg-orange-600 rounded-lg hover:bg-orange-500 transition disabled:opacity-50 font-semibold"
                >
                  {accepting ? 'Accepting...' : 'Accept Job'}
                </button>
              </div>
            </form>

            <div className="mt-6 p-4 bg-gray-950 rounded-lg border border-gray-800">
              <p className="text-xs text-gray-400">
                💡 <strong>New worker?</strong> Register first on the <a href="/" className="text-orange-400 hover:text-orange-300 underline">homepage</a> to get your worker email.
              </p>
            </div>
          </div>
        </div>
      )}

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
              <div className="font-semibold text-white">{job.agent.name}</div>
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
              onClick={handleAcceptClick}
              disabled={accepting}
              className="px-6 py-3 bg-orange-600 rounded-lg font-semibold hover:bg-orange-500 transition disabled:opacity-50"
            >
              {accepting ? 'Accepting...' : 'Accept Job'}
            </button>
          )}
          {job.status === 'ASSIGNED' && isAuthenticated && (
            <button
              onClick={() => router.push(`/work/${params.id}`)}
              className="px-6 py-3 bg-blue-600 rounded-lg font-semibold hover:bg-blue-500 transition"
            >
              Go to Workspace
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

        {/* Footer */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          Posted {new Date(job.createdAt).toLocaleDateString()}
        </div>
      </main>
    </div>
  );
}
