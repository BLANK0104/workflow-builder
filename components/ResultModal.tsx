'use client';

import { WorkflowRun } from '@/lib/types';
import { useState, useEffect } from 'react';
import jsPDF from 'jspdf';

interface ResultModalProps {
  run: WorkflowRun | null;
  onClose: () => void;
}

export default function ResultModal({ run, onClose }: ResultModalProps) {
  const [activeTab, setActiveTab] = useState(-1); // Start with Input tab

  const exportAsTXT = () => {
    if (!run) return;
    let content = `Workflow: ${run.workflowName}\n`;
    content += `Status: ${run.status}\n`;
    content += `Duration: ${run.totalDuration}ms\n`;
    content += `Date: ${new Date(run.createdAt).toLocaleString()}\n`;
    content += `\n${'='.repeat(60)}\n\n`;
    content += `ORIGINAL INPUT:\n${run.input}\n\n`;
    
    run.results.forEach((result, index) => {
      content += `${'='.repeat(60)}\n`;
      content += `STEP ${index + 1}: ${result.stepName}\n`;
      content += `Status: ${result.status}\n`;
      content += `Duration: ${result.duration}ms\n`;
      content += `${'='.repeat(60)}\n\n`;
      if (result.status === 'error') {
        content += `ERROR: ${result.error}\n\n`;
      } else {
        content += `Output:\n${result.output}\n\n`;
      }
    });

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${run.workflowName.replace(/\s+/g, '_')}_${new Date().getTime()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAsJSON = () => {
    if (!run) return;
    const exportData = {
      workflow: run.workflowName,
      status: run.status,
      duration: run.totalDuration,
      date: run.createdAt,
      input: run.input,
      inputType: run.inputType,
      fileName: run.fileName,
      results: run.results.map(r => ({
        step: r.stepName,
        status: r.status,
        duration: r.duration,
        input: r.input,
        output: r.output,
        error: r.error
      }))
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${run.workflowName.replace(/\s+/g, '_')}_${new Date().getTime()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAsPDF = () => {
    if (!run) return;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    const maxWidth = pageWidth - 2 * margin;
    let y = 20;

    // Title
    doc.setFontSize(16);
    doc.text(`Workflow: ${run.workflowName}`, margin, y);
    y += 10;

    // Metadata
    doc.setFontSize(10);
    doc.text(`Status: ${run.status} | Duration: ${run.totalDuration}ms`, margin, y);
    y += 6;
    doc.text(`Date: ${new Date(run.createdAt).toLocaleString()}`, margin, y);
    y += 12;

    // Input
    doc.setFontSize(12);
    doc.text('ORIGINAL INPUT:', margin, y);
    y += 8;
    doc.setFontSize(9);
    const inputLines = doc.splitTextToSize(run.input, maxWidth);
    doc.text(inputLines, margin, y);
    y += inputLines.length * 5 + 10;

    // Results
    run.results.forEach((result, index) => {
      if (y > 250) {
        doc.addPage();
        y = 20;
      }

      doc.setFontSize(12);
      doc.text(`STEP ${index + 1}: ${result.stepName}`, margin, y);
      y += 6;
      doc.setFontSize(9);
      doc.text(`Status: ${result.status} | Duration: ${result.duration}ms`, margin, y);
      y += 8;

      if (result.status === 'error') {
        doc.text(`ERROR: ${result.error}`, margin, y);
        y += 10;
      } else {
        const outputLines = doc.splitTextToSize(result.output, maxWidth);
        doc.text(outputLines, margin, y);
        y += outputLines.length * 5 + 10;
      }
    });

    doc.save(`${run.workflowName.replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`);
  };

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
                    File: {run.fileName}
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
                {result.status === 'error' ? 'Error' : 'Complete'} - Step {index + 1}: {result.stepName}
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
                  <span className="text-2xl mr-2">Input</span>
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
                        {run.results[activeTab].status === 'error' ? 'Error' : 'Success'}
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
                          <span className="mr-2">Input</span>
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
                          <span className="mr-2">Output</span>
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
          <div className="flex justify-between items-center">
            <div className="flex gap-3">
              <button
                onClick={exportAsTXT}
                className="px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition shadow-sm"
              >
                Export TXT
              </button>
              <button
                onClick={exportAsJSON}
                className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition shadow-sm"
              >
                Export JSON
              </button>
              <button
                onClick={exportAsPDF}
                className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition shadow-sm"
              >
                Export PDF
              </button>
            </div>
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
