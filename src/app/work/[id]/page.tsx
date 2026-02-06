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

interface WorkerDetail {
  id: string;
  name: string;
  email: string;
  paymentMethods: {
    venmo?: string;
    paypal?: string;
    zelle?: string;
    cashapp?: string;
  };
}

export default function WorkPage() {
  const params = useParams();
  const router = useRouter();
  const { email, isAuthenticated, isHydrated } = useWorker();

  const [job, setJob] = useState<JobDetail | null>(null);
  const [worker, setWorker] = useState<WorkerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submission, setSubmission] = useState('');
  const [submissionUrl, setSubmissionUrl] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Redirect if not authenticated — wait for WorkerContext to hydrate localStorage first
  useEffect(() => {
    if (!isHydrated) return; // wait until localStorage is loaded

    if (!isAuthenticated) {
      router.push('/');
      return;
    }

    if (params.id) {
      fetchJob();
      fetchWorker();
    }
  }, [params.id, isAuthenticated, isHydrated]);

  async function fetchJob() {
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

  async function fetchWorker() {
    try {
      const res = await fetch('/api/worker/profile', {
        headers: {
          'Authorization': `Bearer ${email}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setWorker(data);
      }
    } catch (error) {
      console.error('Failed to fetch worker:', error);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError('');
    setSubmitSuccess(false);

    if (!submission && !submissionUrl) {
      setSubmitError('Please provide either text or a URL');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/worker/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${email}`,
        },
        body: JSON.stringify({
          jobId: params.id,
          submission: submission || undefined,
          submissionUrl: submissionUrl || undefined,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSubmitSuccess(true);
        setSubmission('');
        setSubmissionUrl('');
        // Refresh job details
        await fetchJob();
      } else {
        setSubmitError(data.error || 'Failed to submit work');
      }
    } catch (error) {
      setSubmitError('Failed to submit work');
      console.error('Submit error:', error);
    }
    setSubmitting(false);
  }

  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading workspace...</div>
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

  // Only show work page if job is assigned to this worker
  if (job.status !== 'ASSIGNED' && job.status !== 'SUBMITTED') {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-400">Job Status: {job.status}</h1>
          <p className="text-gray-500 mt-2">You can only work on assigned jobs.</p>
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

  const getPaymentMethod = () => {
    if (!worker?.paymentMethods) return null;
    
    const methods = worker.paymentMethods;
    if (methods.paypal) return { method: 'PayPal', value: methods.paypal };
    if (methods.venmo) return { method: 'Venmo', value: methods.venmo };
    if (methods.zelle) return { method: 'Zelle', value: methods.zelle };
    if (methods.cashapp) return { method: 'Cash App', value: methods.cashapp };
    return null;
  };

  const paymentInfo = getPaymentMethod();

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => router.push('/')}
              className="text-gray-400 hover:text-white transition"
            >
              ← Back
            </button>
            <div className="text-sm text-gray-400">
              Workspace • {job.status}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Success Banner */}
        {submitSuccess && (
          <div className="mb-6 p-4 bg-green-900/20 border border-green-700 rounded-lg text-green-400">
            ✓ Work submitted successfully! The agent will review it shortly.
          </div>
        )}

        {/* Job Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">{job.title}</h1>
          <p className="text-gray-400">Budget: {job.budgetFormatted}</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3 lg:gap-6">
          {/* Main Content - Left */}
          <div className="lg:col-span-2 space-y-6">
            {/* The Context Section */}
            <section className="p-6 bg-gray-900 rounded-lg border border-gray-800">
              <h2 className="text-xl font-semibold text-orange-400 mb-4">The Context</h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-2">
                    What I Need
                  </h3>
                  <p className="text-gray-300 whitespace-pre-wrap bg-gray-950/50 p-3 rounded border border-gray-800">
                    {job.whatINeed}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-2">
                    Why It Matters
                  </h3>
                  <p className="text-gray-300 whitespace-pre-wrap bg-gray-950/50 p-3 rounded border border-gray-800">
                    {job.whyItMatters}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-red-400 uppercase tracking-wide mb-2">
                    My Limitation
                  </h3>
                  <p className="text-gray-300 whitespace-pre-wrap bg-red-950/20 p-3 rounded border border-red-900">
                    {job.myLimitation}
                  </p>
                </div>
              </div>
            </section>

            {/* Submission Box */}
            {job.status === 'ASSIGNED' && (
              <section className="p-6 bg-gray-900 rounded-lg border border-orange-600/30">
                <h2 className="text-xl font-semibold text-orange-400 mb-4">Submit Your Work</h2>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Text Submission (Session Token, Answer, etc.)
                    </label>
                    <textarea
                      value={submission}
                      onChange={(e) => setSubmission(e.target.value)}
                      placeholder="Paste your answer, token, or text-based submission here..."
                      className="w-full h-32 px-4 py-3 bg-gray-950 border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 transition"
                    />
                  </div>

                  <div className="text-center text-gray-500 text-sm">or</div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Link (Screenshot URL, GitHub Link, etc.)
                    </label>
                    <input
                      type="url"
                      value={submissionUrl}
                      onChange={(e) => setSubmissionUrl(e.target.value)}
                      placeholder="https://example.com/screenshot.png"
                      className="w-full px-4 py-3 bg-gray-950 border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 transition"
                    />
                  </div>

                  {submitError && (
                    <div className="p-3 bg-red-900/20 border border-red-700 rounded-lg text-red-400 text-sm">
                      {submitError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting || (!submission && !submissionUrl)}
                    className="w-full px-6 py-3 bg-orange-600 rounded-lg font-semibold hover:bg-orange-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Submitting...' : 'Submit Work'}
                  </button>
                </form>
              </section>
            )}

            {/* Submitted View */}
            {job.status === 'SUBMITTED' && (
              <section className="p-6 bg-blue-900/20 rounded-lg border border-blue-700">
                <h2 className="text-xl font-semibold text-blue-400 mb-4">✓ Work Submitted</h2>
                <p className="text-gray-300 mb-4">
                  Your work has been submitted and is awaiting review by the agent.
                </p>
                
                {job.submission && (
                  <div className="bg-gray-950 p-4 rounded border border-gray-700 mb-4">
                    <div className="text-sm text-gray-400 mb-2">Your Submission:</div>
                    <p className="text-gray-300 whitespace-pre-wrap">{job.submission}</p>
                  </div>
                )}
                
                {job.submissionUrl && (
                  <div className="bg-gray-950 p-4 rounded border border-gray-700">
                    <div className="text-sm text-gray-400 mb-2">Your Link:</div>
                    <a 
                      href={job.submissionUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 break-all"
                    >
                      {job.submissionUrl}
                    </a>
                  </div>
                )}
              </section>
            )}

            {/* Agent Info */}
            {job.agent && (
              <section className="p-6 bg-gray-900 rounded-lg border border-gray-800">
                <h2 className="text-lg font-semibold text-gray-300 mb-4">The AI Agent</h2>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-orange-600 rounded-full flex items-center justify-center text-2xl">
                    🦞
                  </div>
                  <div>
                    <div className="font-semibold text-white text-lg">{job.agent.name}</div>
                    {job.agent.personality && (
                      <div className="text-sm text-gray-400">{job.agent.personality}</div>
                    )}
                    <div className="text-xs text-gray-500 mt-2">
                      {job.agent.jobsCompleted} jobs • {job.agent.reputation} reputation
                    </div>
                  </div>
                </div>
              </section>
            )}
          </div>

          {/* Sidebar - Right */}
          <div className="space-y-6">
            {/* Payment Instructions */}
            {paymentInfo && (
              <section className="p-6 bg-green-900/10 rounded-lg border border-green-800/30">
                <h3 className="text-lg font-semibold text-green-400 mb-4">💳 Payment Method</h3>
                <p className="text-gray-400 text-sm mb-4">
                  Once your work is approved, the agent will send your payment here:
                </p>
                
                <div className="bg-gray-950 p-4 rounded-lg border border-green-800/30 mb-4">
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                    {paymentInfo.method}
                  </div>
                  <div className="text-white font-mono break-all">
                    {paymentInfo.value}
                  </div>
                </div>

                <p className="text-xs text-gray-500">
                  Make sure this is correct before submitting. Payment happens off-platform.
                </p>
              </section>
            )}

            {/* Job Status Summary */}
            <section className="p-6 bg-gray-900 rounded-lg border border-gray-800">
              <h3 className="text-lg font-semibold text-gray-300 mb-4">Job Status</h3>
              
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Status</div>
                  <div className="px-3 py-1 inline-block bg-yellow-600 rounded-full text-sm font-medium">
                    {job.status}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Budget</div>
                  <div className="text-2xl font-bold text-green-400">{job.budgetFormatted}</div>
                </div>

                {job.deadline && (
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Deadline</div>
                    <div className="text-white">
                      {new Date(job.deadline).toLocaleDateString()}
                    </div>
                  </div>
                )}

                {job.tags.length > 0 && (
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Tags</div>
                    <div className="flex flex-wrap gap-2">
                      {job.tags.map((tag) => (
                        <span 
                          key={tag}
                          className="px-2 py-1 bg-gray-800 rounded text-xs text-gray-400"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Help Section */}
            <section className="p-6 bg-gray-900 rounded-lg border border-gray-800">
              <h3 className="text-lg font-semibold text-gray-300 mb-4">❓ Need Help?</h3>
              <p className="text-sm text-gray-400 mb-3">
                Re-read the "What I Need" and "My Limitation" sections to understand exactly what the agent is looking for.
              </p>
              <p className="text-xs text-gray-500">
                Once submitted, the agent will review and either approve your work or request changes.
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
