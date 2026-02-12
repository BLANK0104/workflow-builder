'use client';

import { useState, useEffect } from 'react';
import { WorkflowRun } from '@/lib/types';
import ResultModal from '@/components/ResultModal';
import Link from 'next/link';

export default function HistoryPage() {
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRun, setSelectedRun] = useState<WorkflowRun | null>(null);
  const [filter, setFilter] = useState<'all' | 'success' | 'error'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [comparingRuns, setComparingRuns] = useState<{ run1: WorkflowRun, run2: WorkflowRun } | null>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/runs');
      if (res.ok) {
        const data = await res.json();
        setRuns(data);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredRuns = runs.filter(run => {
    if (filter !== 'all' && run.status !== filter) return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        run.workflowName.toLowerCase().includes(search) ||
        run.input.toLowerCase().includes(search) ||
        run.results.some(r => r.output.toLowerCase().includes(search))
      );
    }
    return true;
  });

  const toggleCompareSelection = (id: string) => {
    if (selectedForCompare.includes(id)) {
      setSelectedForCompare(prev => prev.filter(i => i !== id));
    } else if (selectedForCompare.length < 2) {
      setSelectedForCompare(prev => [...prev, id]);
    }
  };

  const compareRuns = () => {
    if (selectedForCompare.length !== 2) return;
    const run1 = runs.find(r => r._id?.toString() === selectedForCompare[0]);
    const run2 = runs.find(r => r._id?.toString() === selectedForCompare[1]);
    if (run1 && run2) {
      setComparingRuns({ run1, run2 });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <header className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
              Run History
            </h1>
            <Link 
              href="/" 
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
            >
              ← Back to Home
            </Link>
          </div>
          <p className="text-gray-600 dark:text-gray-300">
            View all your workflow execution history
          </p>
        </header>

        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          {/* Search */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search by workflow name, input, or output..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-indigo-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition"
              >
                Clear
              </button>
            )}
          </div>

          {/* Filter and Compare Buttons */}
          <div className="flex flex-wrap gap-2 items-center">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg transition ${
                filter === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              All ({runs.length})
            </button>
            <button
              onClick={() => setFilter('success')}
              className={`px-4 py-2 rounded-lg transition ${
                filter === 'success'
                  ? 'bg-green-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              Success ({runs.filter(r => r.status === 'success').length})
            </button>
            <button
              onClick={() => setFilter('error')}
              className={`px-4 py-2 rounded-lg transition ${
                filter === 'error'
                  ? 'bg-red-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              Errors ({runs.filter(r => r.status === 'error').length})
            </button>
            
            <div className="ml-auto flex gap-2">
              <button
                onClick={() => {
                  setCompareMode(!compareMode);
                  setSelectedForCompare([]);
                }}
                className={`px-4 py-2 rounded-lg transition ${
                  compareMode
                    ? 'bg-purple-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-purple-500'
                }`}
              >
                {compareMode ? 'Compare Mode Active' : 'Compare'}
              </button>
              
              {compareMode && selectedForCompare.length === 2 && (
                <button
                  onClick={compareRuns}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  View Comparison
                </button>
              )}
            </div>
          </div>
        </div>

        {/* History List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-600 dark:text-gray-400">
              Loading history...
            </div>
          ) : filteredRuns.length === 0 ? (
            <div className="p-8 text-center text-gray-600 dark:text-gray-400">
              {filter === 'all' ? 'No runs yet' : `No ${filter} runs found`}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    {compareMode && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Compare
                      </th>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Date & Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Workflow
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Input Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Steps
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredRuns.map((run) => (
                    <tr 
                      key={run._id?.toString()} 
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                    >
                      {compareMode && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedForCompare.includes(run._id?.toString() || '')}
                            onChange={() => toggleCompareSelection(run._id?.toString() || '')}
                            disabled={selectedForCompare.length >= 2 && !selectedForCompare.includes(run._id?.toString() || '')}
                            className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                          />
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                        {new Date(run.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-300">
                        <div className="font-medium">{run.workflowName}</div>
                        {run.fileName && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {run.fileName}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {run.inputType === 'file' ? (
                          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs">
                            File
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-xs">
                            Text
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {run.results.length}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {run.totalDuration}ms
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {run.status === 'success' ? (
                          <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full text-xs font-medium">
                            Success
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-full text-xs font-medium">
                            Error
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => setSelectedRun(run)}
                          className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 font-medium"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <ResultModal run={selectedRun} onClose={() => setSelectedRun(null)} />
      
      {/* Comparison Modal */}
      {comparingRuns && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Compare Results</h2>
              <button
                onClick={() => {
                  setComparingRuns(null);
                  setSelectedForCompare([]);
                  setCompareMode(false);
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl"
              >
                ×
              </button>
            </div>

            {/* Comparison Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Headers */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border-2 border-blue-200 dark:border-blue-800">
                  <h3 className="text-lg font-bold text-blue-900 dark:text-blue-100 mb-2">
                    {comparingRuns.run1.workflowName}
                  </h3>
                  <div className="space-y-1 text-sm">
                    <p className="text-blue-700 dark:text-blue-300">
                      Date: {new Date(comparingRuns.run1.createdAt).toLocaleString()}
                    </p>
                    <p className="text-blue-700 dark:text-blue-300">
                      Duration: {comparingRuns.run1.totalDuration}ms
                    </p>
                    <p className="text-blue-700 dark:text-blue-300">
                      Steps: {comparingRuns.run1.results.length}
                    </p>
                    <div className="mt-2">
                      {comparingRuns.run1.status === 'success' ? (
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full text-xs font-medium">
                          Success
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-full text-xs font-medium">
                          Error
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border-2 border-purple-200 dark:border-purple-800">
                  <h3 className="text-lg font-bold text-purple-900 dark:text-purple-100 mb-2">
                    {comparingRuns.run2.workflowName}
                  </h3>
                  <div className="space-y-1 text-sm">
                    <p className="text-purple-700 dark:text-purple-300">
                      Date: {new Date(comparingRuns.run2.createdAt).toLocaleString()}
                    </p>
                    <p className="text-purple-700 dark:text-purple-300">
                      Duration: {comparingRuns.run2.totalDuration}ms
                    </p>
                    <p className="text-purple-700 dark:text-purple-300">
                      Steps: {comparingRuns.run2.results.length}
                    </p>
                    <div className="mt-2">
                      {comparingRuns.run2.status === 'success' ? (
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full text-xs font-medium">
                          Success
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-full text-xs font-medium">
                          Error
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Original Input */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Original Input</h4>
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono max-h-40 overflow-y-auto">
                      {comparingRuns.run1.input.substring(0, 500)}
                      {comparingRuns.run1.input.length > 500 && '...'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      {comparingRuns.run1.input.length} characters
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono max-h-40 overflow-y-auto">
                      {comparingRuns.run2.input.substring(0, 500)}
                      {comparingRuns.run2.input.length > 500 && '...'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      {comparingRuns.run2.input.length} characters
                    </p>
                  </div>
                </div>
              </div>

              {/* Step Results */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Step Results</h4>
                <div className="space-y-4">
                  {Array.from({ length: Math.max(comparingRuns.run1.results.length, comparingRuns.run2.results.length) }).map((_, idx) => {
                    const result1 = comparingRuns.run1.results[idx];
                    const result2 = comparingRuns.run2.results[idx];
                    
                    return (
                      <div key={idx} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                        <div className="bg-gray-100 dark:bg-gray-900 px-4 py-2 font-semibold text-gray-900 dark:text-white">
                          Step {idx + 1}
                        </div>
                        <div className="grid grid-cols-2 gap-6 p-4">
                          <div className="border-l-4 border-blue-500 pl-4">
                            {result1 ? (
                              <>
                                <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">
                                  {result1.stepName}
                                </p>
                                <div className="bg-gray-50 dark:bg-gray-900 rounded p-3 max-h-60 overflow-y-auto">
                                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                    {result1.output.substring(0, 800)}
                                    {result1.output.length > 800 && '...'}
                                  </p>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                  {result1.output.length} characters • {result1.duration}ms
                                </p>
                              </>
                            ) : (
                              <p className="text-sm text-gray-500 dark:text-gray-400 italic">No result</p>
                            )}
                          </div>
                          <div className="border-l-4 border-purple-500 pl-4">
                            {result2 ? (
                              <>
                                <p className="text-sm font-medium text-purple-700 dark:text-purple-300 mb-2">
                                  {result2.stepName}
                                </p>
                                <div className="bg-gray-50 dark:bg-gray-900 rounded p-3 max-h-60 overflow-y-auto">
                                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                    {result2.output.substring(0, 800)}
                                    {result2.output.length > 800 && '...'}
                                  </p>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                  {result2.output.length} characters • {result2.duration}ms
                                </p>
                              </>
                            ) : (
                              <p className="text-sm text-gray-500 dark:text-gray-400 italic">No result</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900">
              <button
                onClick={() => {
                  setComparingRuns(null);
                  setSelectedForCompare([]);
                  setCompareMode(false);
                }}
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
              >
                Close Comparison
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
