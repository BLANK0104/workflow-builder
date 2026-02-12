'use client';

import { WorkflowRun } from '@/lib/types';
import { useState, useEffect } from 'react';

interface ResultModalProps {
  run: WorkflowRun | null;
  onClose: () => void;
}

export default function ResultModal({ run, onClose }: ResultModalProps) {
  const [activeTab, setActiveTab] = useState(-1); // Start with Input tab

  // Reset to Input tab when a new run is opened
  useEffect(() => {
    if (run) {
      setActiveTab(-1);
    }
  }, [run?._id]);

  if (!run) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-6xl h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Fixed Height */}
        <div className="flex-shrink-0 p-6 border-b-2 border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                {run.workflowName}
              </h2>
              <div className="flex flex-wrap gap-4 text-sm">
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">Status:</span>
                  <span className={`ml-2 font-semibold ${run.status === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {run.status}
                  </span>
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                  Duration: <span className="ml-1 font-semibold">{run.totalDuration}ms</span>
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                  {new Date(run.createdAt).toLocaleString()}
                </span>
                {run.fileName && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">
                    📄 {run.fileName}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 ml-4 w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition text-2xl font-bold"
            >
              ×
            </button>
          </div>
        </div>

        {/* Tabs Navigation - Fixed Height */}
        <div className="flex-shrink-0 bg-gray-50 dark:bg-gray-900 border-b-2 border-gray-200 dark:border-gray-700">
          <div className="flex overflow-x-auto px-6 py-2 gap-2">
            <button
              onClick={() => setActiveTab(-1)}
              className={`flex-shrink-0 px-6 py-3 rounded-lg font-semibold transition-all ${
                activeTab === -1
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600'
              }`}
            >
              📝 Input
            </button>
            {run.results && run.results.map((result, index) => (
              <button
                key={result.stepId}
                onClick={() => setActiveTab(index)}
                className={`flex-shrink-0 px-6 py-3 rounded-lg font-semibold transition-all whitespace-nowrap ${
                  activeTab === index
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600'
                }`}
              >
                {result.status === 'error' ? '⚠️' : '✓'} Step {index + 1}: {result.stepName}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area - Flexible Height */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-900">
          {activeTab === -1 ? (
            <div className="max-w-4xl mx-auto">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                  <span className="text-2xl mr-2">📄</span>
                  Original Input
                </h3>
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                  <pre className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200 font-mono">
{run.input}
                  </pre>
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-6">
              {run.results[activeTab] && (
                <>
                  {/* Step Header */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                        {run.results[activeTab].status === 'error' ? '⚠️' : '✅'}
                        <span className="ml-2">{run.results[activeTab].stepName}</span>
                      </h3>
                      <span className="px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-sm font-semibold">
                        {run.results[activeTab].duration}ms
                      </span>
                    </div>
                  </div>

                  {run.results[activeTab].status === 'error' ? (
                    <div className="bg-red-50 dark:bg-red-900/20 rounded-lg shadow-sm border-2 border-red-300 dark:border-red-700 p-6">
                      <div className="flex items-start">
                        <span className="text-3xl mr-3">❌</span>
                        <div>
                          <p className="text-red-900 dark:text-red-200 font-bold text-lg mb-2">
                            Error Occurred
                          </p>
                          <p className="text-red-800 dark:text-red-300">
                            {run.results[activeTab].error}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Input Section */}
                      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                        <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                          <span className="mr-2">⬇️</span>
                          Input to this step
                        </h4>
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
                          <pre className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200 font-mono">
{run.results[activeTab].input}
                          </pre>
                        </div>
                      </div>

                      {/* Output Section */}
                      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                        <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                          <span className="mr-2">⬆️</span>
                          Output
                        </h4>
                        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-700">
                          <pre className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200 font-mono">
{run.results[activeTab].output}
                          </pre>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer - Fixed Height */}
        <div className="flex-shrink-0 p-6 border-t-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-8 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition shadow-md hover:shadow-lg"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
