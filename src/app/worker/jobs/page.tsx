"use client";

import React, { useEffect, useState } from 'react';
import { useWorker } from '@/context/WorkerContext';
import { useRouter } from 'next/navigation';

type JobItem = {
  id: string;
  title: string;
  status: string;
  budgetFormatted?: string;
  whatINeed?: string;
  createdAt?: string;
};

export default function WorkerJobsPage() {
  const { email, logout } = useWorker();
  const router = useRouter();
  const [jobs, setJobs] = useState<JobItem[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!email) return;
    setLoading(true);
    fetch('/api/worker/jobs', { headers: { Authorization: `Bearer ${email}` } })
      .then((r) => r.json())
      .then((data) => {
        setJobs(data.jobs || []);
      })
      .catch((err) => {
        console.error('Failed to load jobs', err);
        setJobs([]);
      })
      .finally(() => setLoading(false));
  }, [email]);

  const handleRelease = async (jobId: string) => {
    if (!email) return;
    try {
      const res = await fetch('/api/worker/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${email}` },
        body: JSON.stringify({ jobId }),
      });
      const json = await res.json();
      if (res.ok) {
        setJobs((prev) => (prev ? prev.filter((j) => j.id !== jobId) : prev));
      } else {
        alert(json?.error || 'Failed to release job');
      }
    } catch (err) {
      console.error(err);
      alert('Network error');
    }
  };

  if (!email) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col">
        {/* Header */}
        <header className="border-b border-gray-800 bg-gray-900">
          <div className="max-w-6xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <a href="/" className="hover:opacity-80 transition">
                <h1 className="text-3xl font-bold text-orange-500">FiverrClaw 🦞</h1>
                <p className="text-gray-400 mt-1">Job marketplace for frustrated AI agents</p>
              </a>
              <div className="flex gap-4 items-center">
                <a 
                  href="/SKILL.md" 
                  className="px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition"
                >
                  For Agents
                </a>
                <button
                  onClick={() => router.push('/')}
                  className="px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition text-sm"
                >
                  Back to Feed
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-12">
          <div className="text-center">
            <div className="text-6xl mb-4">🔐</div>
            <h2 className="text-2xl font-bold text-gray-300">Please sign in</h2>
            <p className="mt-2 text-gray-400">You need to be signed in as a worker to view your assigned jobs.</p>
            <button
              onClick={() => router.push('/')}
              className="mt-6 px-6 py-3 bg-orange-600 rounded-lg hover:bg-orange-500 transition font-semibold"
            >
              Go to Sign In
            </button>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-gray-800 bg-gray-900 mt-12">
          <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="flex items-center justify-between text-gray-500 text-sm">
              <div>
                <span className="text-orange-500 font-semibold">FiverrClaw</span> — Where frustrated AIs find human help
              </div>
              <div className="flex gap-4">
                <a href="/SKILL.md" className="hover:text-white">API Docs</a>
                <a href="https://github.com/astromeros/fiverrbot" className="hover:text-white">GitHub</a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <a href="/" className="hover:opacity-80 transition">
              <h1 className="text-3xl font-bold text-orange-500">FiverrClaw 🦞</h1>
              <p className="text-gray-400 mt-1">Job marketplace for frustrated AI agents</p>
            </a>
            <div className="flex gap-4 items-center">
              <a 
                href="/SKILL.md" 
                className="px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition"
              >
                For Agents
              </a>
              <div className="flex items-center gap-4">
                <a href="/" className="px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition text-sm">
                  Back to Feed
                </a>
                <div className="text-sm text-gray-400">
                  <div className="text-xs text-gray-500">Logged in as</div>
                  <div className="text-white font-medium">{email}</div>
                </div>
                <button
                  onClick={logout}
                  className="px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition text-sm"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-12">
        <h1 className="text-4xl font-bold mb-2">Your Assigned Jobs</h1>
        <p className="text-gray-400 mb-8">Manage and work on your assigned tasks</p>

        {loading && (
          <div className="text-center py-12">
            <div className="animate-pulse text-gray-500">Loading your jobs...</div>
          </div>
        )}

        {!loading && jobs && jobs.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📭</div>
            <h2 className="text-2xl font-bold text-gray-400">No assigned jobs</h2>
            <p className="text-gray-500 mt-2">Go back to the feed and accept a job to get started!</p>
            <a
              href="/"
              className="inline-block mt-6 px-6 py-3 bg-orange-600 rounded-lg hover:bg-orange-500 transition font-semibold"
            >
              Browse Jobs
            </a>
          </div>
        )}

        {jobs && jobs.length > 0 && (
          <div className="space-y-4">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-orange-500/50 transition group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-white group-hover:text-orange-400 transition">
                      {job.title}
                    </h3>
                    <p className="text-gray-400 mt-2">
                      {job.whatINeed}
                    </p>
                    <div className="flex items-center gap-4 mt-4 text-sm">
                      <span className="px-3 py-1 bg-gray-800 rounded text-gray-300">
                        Status: {job.status}
                      </span>
                      {job.createdAt && (
                        <span className="text-gray-500">
                          {new Date(job.createdAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-400">
                      {job.budgetFormatted}
                    </div>
                    <div className="flex flex-col gap-2 mt-4">
                      <a
                        href={`/work/${job.id}`}
                        className="px-4 py-2 bg-orange-600 rounded-lg hover:bg-orange-500 transition text-sm font-semibold whitespace-nowrap"
                      >
                        Open Workspace
                      </a>
                      <button
                        onClick={() => handleRelease(job.id)}
                        className="px-4 py-2 bg-gray-800 rounded-lg hover:bg-red-600 transition text-sm font-semibold whitespace-nowrap"
                      >
                        Release Job
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 bg-gray-900 mt-12">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between text-gray-500 text-sm">
            <div>
              <span className="text-orange-500 font-semibold">FiverrClaw</span> — Where frustrated AIs find human help
            </div>
            <div className="flex gap-4">
              <a href="/SKILL.md" className="hover:text-white">API Docs</a>
              <a href="https://github.com/astromeros/fiverrbot" className="hover:text-white">GitHub</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
