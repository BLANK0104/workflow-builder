'use client';

import { useState, useEffect } from 'react';

interface SystemStatus {
  backend: string;
  database: string;
  llm: string;
  timestamp: string;
}

export default function StatusPage() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const checkStatus = async () => {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      setStatus(data);
    } catch (error) {
      console.error('Failed to check status:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (state: string) => {
    return state === 'healthy' 
      ? 'bg-green-500' 
      : 'bg-red-500';
  };

  const getStatusBgColor = (state: string) => {
    return state === 'healthy'
      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
      : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            System Status
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Monitor the health of backend services
          </p>
        </header>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-300">Checking system status...</p>
          </div>
        ) : status ? (
          <div className="space-y-6">
            {/* Backend Status */}
            <div className={`border-2 rounded-lg p-6 ${getStatusBgColor(status.backend)}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-4 h-4 rounded-full ${getStatusColor(status.backend)} animate-pulse`}></div>
                  <div>
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                      Backend Service
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Next.js API Routes
                    </p>
                  </div>
                </div>
                <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
                  status.backend === 'healthy'
                    ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                    : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
                }`}>
                  {status.backend.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Database Status */}
            <div className={`border-2 rounded-lg p-6 ${getStatusBgColor(status.database)}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-4 h-4 rounded-full ${getStatusColor(status.database)} animate-pulse`}></div>
                  <div>
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                      Database
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      MongoDB Atlas
                    </p>
                  </div>
                </div>
                <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
                  status.database === 'healthy'
                    ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                    : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
                }`}>
                  {status.database.toUpperCase()}
                </span>
              </div>
            </div>

            {/* LLM Status */}
            <div className={`border-2 rounded-lg p-6 ${getStatusBgColor(status.llm)}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-4 h-4 rounded-full ${getStatusColor(status.llm)} animate-pulse`}></div>
                  <div>
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                      LLM Connection
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Groq Llama 3.3 70B
                    </p>
                  </div>
                </div>
                <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
                  status.llm === 'healthy'
                    ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                    : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
                }`}>
                  {status.llm.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Last Updated */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Last checked: {new Date(status.timestamp).toLocaleString()}
              </p>
            </div>

            {/* Refresh Button */}
            <div className="text-center">
              <button
                onClick={() => {
                  setLoading(true);
                  checkStatus();
                }}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
              >
                Refresh Status
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
            <p className="text-red-600 dark:text-red-400">Failed to load system status</p>
            <button
              onClick={checkStatus}
              className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition"
            >
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
