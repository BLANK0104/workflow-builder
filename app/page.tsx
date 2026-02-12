'use client';

import { useState, useEffect } from 'react';
import { Workflow, WorkflowRun, StepType } from '@/lib/types';
import ResultModal from '@/components/ResultModal';
import LoadingSpinner from '@/components/LoadingSpinner';
import { extractTextFromFile, validateFileSize, getSupportedFileTypes } from '@/lib/fileUtils';
import { MAX_INPUT_CHARS } from '@/lib/constants';
import Link from 'next/link';

const STEP_TYPES: { value: StepType; label: string; description: string }[] = [
  { value: 'clean', label: 'Clean Text', description: 'Remove extra whitespace and fix formatting' },
  { value: 'summarize', label: 'Summarize', description: 'Create a concise summary' },
  { value: 'extract', label: 'Extract Key Points', description: 'Extract main points as bullets' },
  { value: 'categorize', label: 'Categorize', description: 'Tag with relevant categories' },
  { value: 'translate', label: 'Translate', description: 'Translate to English' },
  { value: 'sentiment', label: 'Sentiment Analysis', description: 'Analyze sentiment and tone' },
  { value: 'keywords', label: 'Extract Keywords', description: 'Find important keywords' },
  { value: 'questions', label: 'Generate Questions', description: 'Create relevant questions' },
  { value: 'expand', label: 'Expand', description: 'Add more details and context' },
  { value: 'simplify', label: 'Simplify', description: 'Make easier to understand' },
  { value: 'bullet-points', label: 'Bullet Points', description: 'Convert to bullet format' },
  { value: 'custom', label: 'Custom Step', description: 'Define your own processing step' },
];

export default function Home() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [recentRuns, setRecentRuns] = useState<WorkflowRun[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<string>('');
  const [inputText, setInputText] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [currentRun, setCurrentRun] = useState<WorkflowRun | null>(null);
  
  // New workflow form
  const [newWorkflowName, setNewWorkflowName] = useState('');
  const [newWorkflowDesc, setNewWorkflowDesc] = useState('');
  const [selectedSteps, setSelectedSteps] = useState<StepType[]>([]);
  const [customPrompts, setCustomPrompts] = useState<{ [key: string]: string }>({});
  
  // File upload
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [inputMode, setInputMode] = useState<'text' | 'file'>('text');

  useEffect(() => {
    loadWorkflows();
    loadRecentRuns();
  }, []);

  const loadWorkflows = async () => {
    try {
      const res = await fetch('/api/workflows');
      if (res.ok) {
        const data = await res.json();
        setWorkflows(data);
      }
    } catch (err) {
      console.error('Failed to load workflows:', err);
    }
  };

  const loadRecentRuns = async () => {
    try {
      const res = await fetch('/api/runs?limit=5');
      if (res.ok) {
        const data = await res.json();
        setRecentRuns(data);
      }
    } catch (err) {
      console.error('Failed to load runs:', err);
    }
  };

  const handleCreateWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (selectedSteps.length < 2 || selectedSteps.length > 4) {
      setError('Please select 2-4 steps');
      return;
    }

    // Validate custom steps have prompts
    for (let i = 0; i < selectedSteps.length; i++) {
      if (selectedSteps[i] === 'custom' && !customPrompts[`custom-${i}`]) {
        setError('Please provide prompts for all custom steps');
        return;
      }
    }

    const steps = selectedSteps.map((type, index) => {
      const stepLabel = STEP_TYPES.find(s => s.value === type)?.label || type;
      return {
        id: `step-${index + 1}`,
        type,
        name: type === 'custom' && customPrompts[`custom-${index}`] 
          ? `Custom: ${customPrompts[`custom-${index}`].substring(0, 30)}...`
          : stepLabel,
        order: index + 1,
        customPrompt: type === 'custom' ? customPrompts[`custom-${index}`] : undefined,
      };
    });

    try {
      const res = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newWorkflowName,
          description: newWorkflowDesc,
          steps,
        }),
      });

      if (res.ok) {
        setNewWorkflowName('');
        setNewWorkflowDesc('');
        setSelectedSteps([]);
        setCustomPrompts({});
        setShowCreateForm(false);
        setSuccessMessage('Workflow created successfully!');
        loadWorkflows();
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to create workflow');
      }
    } catch (err) {
      setError('Failed to create workflow: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    const file = e.target.files?.[0];
    
    if (!file) return;

    try {
      // Validate file size (10MB limit)
      validateFileSize(file, 10);
      
      // Extract text
      const text = await extractTextFromFile(file);
      
      // Check text size against Gemini limits
      if (text.length > MAX_INPUT_CHARS) {
        setError(`File content exceeds maximum size limit of ${Math.floor(MAX_INPUT_CHARS / 1024 / 1024)}MB. Please use a smaller file.`);
        e.target.value = '';
        return;
      }
      
      if (text.trim().length === 0) {
        setError('File appears to be empty or contains no readable text.');
        e.target.value = '';
        return;
      }
      
      setSelectedFile(file);
      setInputText(text);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read file');
      e.target.value = '';
    }
  };

  const handleRunWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!selectedWorkflow) {
      setError('Please select a workflow');
      return;
    }

    if (!inputText.trim()) {
      setError(inputMode === 'file' ? 'Please upload a file' : 'Please enter input text');
      return;
    }

    // Check input size
    if (inputText.length > MAX_INPUT_CHARS) {
      setError(`Input exceeds maximum size limit of ${Math.floor(MAX_INPUT_CHARS / 1024 / 1024)}MB`);
      return;
    }

    setIsRunning(true);

    try {
      const res = await fetch('/api/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflowId: selectedWorkflow,
          input: inputText,
          inputType: inputMode,
          fileName: selectedFile?.name,
          fileType: selectedFile?.type,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setInputText('');
        setSelectedFile(null);
        setSuccessMessage('Workflow executed successfully!');
        loadRecentRuns();
        setCurrentRun(data);
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setError(data.error || 'Failed to run workflow');
      }
    } catch (err) {
      setError('Failed to run workflow: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setIsRunning(false);
    }
  };

  const toggleStep = (stepType: StepType, index?: number) => {
    if (selectedSteps.includes(stepType) && stepType !== 'custom') {
      setSelectedSteps(prev => prev.filter(s => s !== stepType));
    } else {
      setSelectedSteps(prev => [...prev, stepType]);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Workflow Builder Lite
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Create and run simple text automation workflows
          </p>
          <div className="flex justify-center gap-4">
            <Link 
              href="/status" 
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              System Status
            </Link>
            <Link 
              href="/history" 
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
            >
              Run History
            </Link>
          </div>
        </header>

        {error && (
          <div className="mb-4 p-4 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 rounded-lg">
            <strong>Error:</strong> {error}
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-4 bg-green-100 dark:bg-green-900 border border-green-400 dark:border-green-700 text-green-700 dark:text-green-200 rounded-lg">
            {successMessage}
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {/* Create Workflow */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                1. Create Workflow
              </h2>
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
              >
                {showCreateForm ? 'Cancel' : '+ New'}
              </button>
            </div>

            {showCreateForm ? (
              <form onSubmit={handleCreateWorkflow} className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                <div>
                  <label htmlFor="workflow-name" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                    Workflow Name *
                  </label>
                  <input
                    id="workflow-name"
                    type="text"
                    value={newWorkflowName}
                    onChange={(e) => setNewWorkflowName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="workflow-desc" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                    Description (optional)
                  </label>
                  <input
                    id="workflow-desc"
                    type="text"
                    value={newWorkflowDesc}
                    onChange={(e) => setNewWorkflowDesc(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    Select 2-4 Steps (in order)
                  </label>
                  <div className="space-y-2">
                    {STEP_TYPES.map((step, idx) => {
                      const isSelected = selectedSteps.includes(step.value);
                      const stepIndex = selectedSteps.indexOf(step.value);
                      
                      return (
                        <div key={`${step.value}-${idx}`}>
                          <div
                            onClick={() => toggleStep(step.value, idx)}
                            className={`p-3 border rounded-lg cursor-pointer transition ${
                              isSelected
                                ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900'
                                : 'border-gray-300 dark:border-gray-600 hover:border-indigo-400'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="font-medium text-gray-900 dark:text-white">
                                  {step.label}
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                  {step.description}
                                </div>
                              </div>
                              {isSelected && (
                                <span className="text-indigo-600 dark:text-indigo-400 font-bold ml-2">
                                  #{stepIndex + 1}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {step.value === 'custom' && isSelected && (
                            <div className="mt-2 ml-4">
                              <label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">
                                Custom Prompt *
                              </label>
                              <textarea
                                value={customPrompts[`custom-${stepIndex}`] || ''}
                                onChange={(e) => setCustomPrompts({
                                  ...customPrompts,
                                  [`custom-${stepIndex}`]: e.target.value
                                })}
                                placeholder="Describe what you want this step to do..."
                                className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                rows={2}
                                required
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
                >
                  Create Workflow
                </button>
              </form>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {workflows.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                    No workflows yet. Create one to get started!
                  </p>
                ) : (
                  workflows.map((wf) => (
                    <div
                      key={wf._id?.toString()}
                      className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-indigo-400 transition"
                    >
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                        {wf.name}
                      </h3>
                      {wf.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {wf.description}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {wf.steps.map((step, idx) => (
                          <span
                            key={step.id}
                            className="text-xs px-2 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded"
                            title={step.customPrompt}
                          >
                            {idx + 1}. {step.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Run Workflow */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">
              2. Run Workflow
            </h2>
            <form onSubmit={handleRunWorkflow} className="space-y-4">
              <div>
                <label htmlFor="workflow-select" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Select Workflow *
                </label>
                <select
                  id="workflow-select"
                  value={selectedWorkflow}
                  onChange={(e) => setSelectedWorkflow(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                >
                  <option value="">-- Choose a workflow --</option>
                  {workflows.map((wf) => (
                    <option key={wf._id?.toString()} value={wf._id?.toString()}>
                      {wf.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Input Mode Selection */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Input Type
                </label>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setInputMode('text');
                      setSelectedFile(null);
                    }}
                    className={`flex-1 px-4 py-2 rounded-lg border-2 transition ${
                      inputMode === 'text'
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-medium'
                        : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    Text Input
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputMode('file')}
                    className={`flex-1 px-4 py-2 rounded-lg border-2 transition ${
                      inputMode === 'file'
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-medium'
                        : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    File Upload
                  </button>
                </div>
              </div>

              {inputMode === 'text' ? (
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                    Input Text *
                  </label>
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white h-40"
                    placeholder="Enter your text here..."
                    required
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {inputText.length} / {MAX_INPUT_CHARS} characters (~512KB max)
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                    Upload File *
                  </label>
                  <input
                    type="file"
                    accept={getSupportedFileTypes()}
                    onChange={handleFileChange}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Supported: TXT, MD, CSV, JSON, PDF, Word (DOCX), Excel (XLSX, XLS) - Max 10MB
                  </p>
                  {selectedFile && (
                    <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
                      <p className="text-sm text-green-700 dark:text-green-300">
                        ✓ {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                      </p>
                    </div>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={isRunning}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
              >
                {isRunning ? '⏳ Running...' : '▶ Run Workflow'}
              </button>
            </form>
          </div>
        </div>

        {/* Recent Runs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              3. Recent Runs (Last 5)
            </h2>
            <Link 
              href="/history" 
              className="text-indigo-600 dark:text-indigo-400 hover:underline text-sm font-medium"
            >
              View All History →
            </Link>
          </div>
          {recentRuns.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">
              No runs yet. Execute a workflow to see results here!
            </p>
          ) : (
            <div className="space-y-4">
              {recentRuns.map((run) => (
                <div
                  key={run._id?.toString()}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-indigo-400 transition cursor-pointer"
                  onClick={() => setCurrentRun(run)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {run.workflowName}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(run.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        run.status === 'success'
                          ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                          : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
                      }`}
                    >
                      {run.status}
                    </span>
                  </div>
                  
                  <div className="flex gap-2 mb-2">
                    <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
                      {run.results.length} steps
                    </span>
                    <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
                      {run.totalDuration}ms
                    </span>
                    {run.fileName && (
                      <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                        📄 {run.fileName}
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
                    Click to view full results →
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {isRunning && <LoadingSpinner />}
      <ResultModal run={currentRun} onClose={() => setCurrentRun(null)} />
    </div>
  );
}
