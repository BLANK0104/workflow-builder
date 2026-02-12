'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { WorkflowRun, Workflow } from '@/lib/types';

interface AnalyticsData {
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  successRate: number;
  averageDuration: number;
  totalWorkflows: number;
  mostUsedWorkflows: { name: string; count: number; id: string }[];
  recentActivity: { date: string; count: number }[];
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('30d');

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      
      // Fetch workflows and runs
      const [workflowsRes, runsRes] = await Promise.all([
        fetch('/api/workflows'),
        fetch('/api/runs'),
      ]);

      const workflows: Workflow[] = await workflowsRes.json();
      const runs: WorkflowRun[] = await runsRes.json();

      // Filter by time range
      const now = new Date();
      const cutoffDate = new Date();
      if (timeRange === '7d') cutoffDate.setDate(now.getDate() - 7);
      if (timeRange === '30d') cutoffDate.setDate(now.getDate() - 30);

      const filteredRuns = timeRange === 'all' 
        ? runs 
        : runs.filter(r => new Date(r.createdAt) >= cutoffDate);

      // Calculate statistics
      const totalRuns = filteredRuns.length;
      const successfulRuns = filteredRuns.filter(r => r.status === 'success').length;
      const failedRuns = filteredRuns.filter(r => r.status === 'error').length;
      const successRate = totalRuns > 0 ? (successfulRuns / totalRuns) * 100 : 0;

      // Calculate average duration (if totalDuration is available)
      const durations = filteredRuns
        .filter(r => r.totalDuration)
        .map(r => r.totalDuration || 0);
      const averageDuration = durations.length > 0
        ? durations.reduce((sum, d) => sum + d, 0) / durations.length
        : 0;

      // Most used workflows
      const workflowCounts: { [key: string]: number } = {};
      filteredRuns.forEach(run => {
        const wfId = run.workflowId?.toString() || 'unknown';
        workflowCounts[wfId] = (workflowCounts[wfId] || 0) + 1;
      });

      const mostUsedWorkflows = Object.entries(workflowCounts)
        .map(([id, count]) => {
          const workflow = workflows.find(w => w._id?.toString() === id);
          return {
            id,
            name: workflow?.name || 'Unknown Workflow',
            count,
          };
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Recent activity (last 7 days, daily counts)
      const activityMap: { [key: string]: number } = {};
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return d.toISOString().split('T')[0];
      });

      last7Days.forEach(date => {
        activityMap[date] = 0;
      });

      filteredRuns.forEach(run => {
        const date = new Date(run.createdAt).toISOString().split('T')[0];
        if (activityMap[date] !== undefined) {
          activityMap[date]++;
        }
      });

      const recentActivity = last7Days.map(date => ({
        date,
        count: activityMap[date] || 0,
      }));

      setAnalytics({
        totalRuns,
        successfulRuns,
        failedRuns,
        successRate,
        averageDuration,
        totalWorkflows: workflows.length,
        mostUsedWorkflows,
        recentActivity,
      });
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Failed to load analytics</p>
          <Link href="/" className="text-indigo-600 hover:underline mt-2 inline-block">
            ← Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const maxActivity = Math.max(...analytics.recentActivity.map(a => a.count), 1);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <header className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                Analytics Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Performance insights and usage statistics
              </p>
            </div>
            <Link 
              href="/" 
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
            >
              ← Home
            </Link>
          </div>

          {/* Time Range Selector */}
          <div className="mt-6 flex gap-2">
            <button
              onClick={() => setTimeRange('7d')}
              className={`px-4 py-2 rounded-lg transition ${
                timeRange === '7d'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setTimeRange('30d')}
              className={`px-4 py-2 rounded-lg transition ${
                timeRange === '30d'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              Last 30 Days
            </button>
            <button
              onClick={() => setTimeRange('all')}
              className={`px-4 py-2 rounded-lg transition ${
                timeRange === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              All Time
            </button>
          </div>
        </header>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Runs</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {analytics.totalRuns}
                </p>
              </div>
              <div className="text-4xl">Runs</div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Success Rate</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {analytics.successRate.toFixed(1)}%
                </p>
              </div>
              <div className="text-4xl">Success</div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              {analytics.successfulRuns} successful, {analytics.failedRuns} failed
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Avg Duration</p>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {(analytics.averageDuration / 1000).toFixed(1)}s
                </p>
              </div>
              <div className="text-4xl">Time</div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Workflows</p>
                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                  {analytics.totalWorkflows}
                </p>
              </div>
              <div className="text-4xl">Total</div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Most Used Workflows */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              Top Workflows
            </h2>
            {analytics.mostUsedWorkflows.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                No workflow usage data yet
              </p>
            ) : (
              <div className="space-y-3">
                {analytics.mostUsedWorkflows.map((wf, idx) => (
                  <div
                    key={wf.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                        #{idx + 1}
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {wf.name}
                      </span>
                    </div>
                    <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-full text-sm font-semibold">
                      {wf.count} runs
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Activity Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              Recent Activity (Last 7 Days)
            </h2>
            <div className="space-y-3">
              {analytics.recentActivity.map((day) => {
                const percentage = (day.count / maxActivity) * 100;
                const dateObj = new Date(day.date);
                const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

                return (
                  <div key={day.date} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        {dayName}, {dateStr}
                      </span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {day.count} runs
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
