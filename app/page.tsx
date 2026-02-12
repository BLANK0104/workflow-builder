'use client';

import { useState, useEffect } from 'react';
import { Workflow, WorkflowRun, StepType } from '@/lib/types';
import ResultModal from '@/components/ResultModal';
import LoadingSpinner from '@/components/LoadingSpinner';
import { extractTextFromFile, validateFileSize, getSupportedFileTypes } from '@/lib/fileUtils';
import { MAX_INPUT_CHARS, validateTokenLimit } from '@/lib/constants';
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

const WORKFLOW_TEMPLATES = [
  {
    name: 'Document Summarizer',
    description: 'Clean, summarize, and convert to bullet points',
    steps: ['clean', 'summarize', 'bullet-points'] as StepType[],
  },
  {
    name: 'Content Analyzer',
    description: 'Extract key points, analyze sentiment, and find keywords',
    steps: ['extract', 'sentiment', 'keywords'] as StepType[],
  },
  {
    name: 'Translation Pipeline',
    description: 'Clean, translate, and simplify text',
    steps: ['clean', 'translate', 'simplify'] as StepType[],
  },
  {
    name: 'Research Assistant',
    description: 'Extract key points, generate questions, and expand details',
    steps: ['extract', 'questions', 'expand'] as StepType[],
  },
  {
    name: 'Content Optimizer',
    description: 'Clean, simplify, categorize, and find keywords',
    steps: ['clean', 'simplify', 'categorize', 'keywords'] as StepType[],
  },
];

export default function Home() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [recentRuns, setRecentRuns] = useState<WorkflowRun[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<string>('');
  const [inputText, setInputText] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [currentRun, setCurrentRun] = useState<WorkflowRun | null>(null);
  
  // Progress tracking
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [totalSteps, setTotalSteps] = useState<number>(0);
  const [currentStepName, setCurrentStepName] = useState<string>('');
  
  // New workflow form
  const [newWorkflowName, setNewWorkflowName] = useState('');
  const [newWorkflowDesc, setNewWorkflowDesc] = useState('');
  const [selectedSteps, setSelectedSteps] = useState<StepType[]>([]);
  const [customPrompts, setCustomPrompts] = useState<{ [key: string]: string }>({});
  
  // Edit workflow
  const [editingWorkflowId, setEditingWorkflowId] = useState<string | null>(null);
  
  // Workflow visualization
  const [visualizingWorkflowId, setVisualizingWorkflowId] = useState<string | null>(null);
  
  // File upload
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [inputMode, setInputMode] = useState<'text' | 'file'>('text');
  const [batchFiles, setBatchFiles] = useState<File[]>([]);
  const [batchMode, setBatchMode] = useState(false);
  
  // Current outputs
  const [currentOutputs, setCurrentOutputs] = useState<WorkflowRun[]>([]);
  const [showCurrentOutputs, setShowCurrentOutputs] = useState(false);

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
      const endpoint = editingWorkflowId 
        ? `/api/workflows/${editingWorkflowId}` 
        : '/api/workflows';
      const method = editingWorkflowId ? 'PUT' : 'POST';
      
      const res = await fetch(endpoint, {
        method,
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
        setEditingWorkflowId(null);
        setSuccessMessage(editingWorkflowId ? 'Workflow updated successfully!' : 'Workflow created successfully!');
        loadWorkflows();
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to save workflow');
      }
    } catch (err) {
      setError('Failed to save workflow: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleEditWorkflow = (workflow: Workflow) => {
    setEditingWorkflowId(workflow._id?.toString() || null);
    setNewWorkflowName(workflow.name);
    setNewWorkflowDesc(workflow.description);
    setSelectedSteps(workflow.steps.map(s => s.type));
    
    const prompts: { [key: string]: string } = {};
    workflow.steps.forEach((step, index) => {
      if (step.customPrompt) {
        prompts[`custom-${index}`] = step.customPrompt;
      }
    });
    setCustomPrompts(prompts);
    setShowCreateForm(true);
  };

  const handleDeleteWorkflow = async (id: string) => {
    if (!confirm('Are you sure you want to delete this workflow?')) return;
    
    try {
      const res = await fetch(`/api/workflows/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSuccessMessage('Workflow deleted successfully!');
        loadWorkflows();
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to delete workflow');
      }
    } catch (err) {
      setError('Failed to delete workflow: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleDuplicateWorkflow = async (workflow: Workflow) => {
    try {
      const res = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${workflow.name} (Copy)`,
          description: workflow.description,
          steps: workflow.steps,
        }),
      });

      if (res.ok) {
        setSuccessMessage('Workflow duplicated successfully!');
        loadWorkflows();
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to duplicate workflow');
      }
    } catch (err) {
      setError('Failed to duplicate workflow: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleExportWorkflow = (workflow: Workflow) => {
    const exportData = {
      name: workflow.name,
      description: workflow.description,
      steps: workflow.steps,
      exportedAt: new Date().toISOString(),
      version: '1.0',
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${workflow.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_workflow.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setSuccessMessage('Workflow exported successfully!');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleImportWorkflow = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const importedData = JSON.parse(text);

      // Validate structure
      if (!importedData.name || !importedData.steps || !Array.isArray(importedData.steps)) {
        setError('Invalid workflow file format');
        e.target.value = '';
        return;
      }

      // Check if workflow with same name exists
      const existingWorkflow = workflows.find(w => w.name === importedData.name);
      const workflowName = existingWorkflow 
        ? `${importedData.name} (Imported ${new Date().toLocaleDateString()})`
        : importedData.name;

      // Create the workflow
      const res = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: workflowName,
          description: importedData.description || '',
          steps: importedData.steps,
        }),
      });

      if (res.ok) {
        setSuccessMessage('Workflow imported successfully!');
        loadWorkflows();
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to import workflow');
      }
    } catch (err) {
      setError('Failed to import workflow: ' + (err instanceof Error ? err.message : 'Invalid JSON file'));
    }
    
    e.target.value = '';
  };

  const handleCancelEdit = () => {
    setEditingWorkflowId(null);
    setNewWorkflowName('');
    setNewWorkflowDesc('');
    setSelectedSteps([]);
    setCustomPrompts({});
    setShowCreateForm(false);
  };

  const applyTemplate = (template: typeof WORKFLOW_TEMPLATES[0]) => {
    setNewWorkflowName(template.name);
    setNewWorkflowDesc(template.description);
    setSelectedSteps(template.steps);
    setCustomPrompts({});
    setShowTemplates(false);
    setShowCreateForm(true);
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

  const handleBatchFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    const files = Array.from(e.target.files || []);
    
    if (files.length === 0) return;
    if (files.length > 10) {
      setError('Maximum 10 files allowed for batch processing');
      e.target.value = '';
      return;
    }

    // Validate each file
    for (const file of files) {
      try {
        validateFileSize(file, 10);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'File validation failed');
        e.target.value = '';
        return;
      }
    }

    setBatchFiles(files);
    setSuccessMessage(`${files.length} files ready for batch processing`);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleBatchRun = async () => {
    if (batchFiles.length === 0 || !selectedWorkflow) return;
    
    setIsRunning(true);
    setError('');
    const results = [];
    const errors = [];
    
    for (let i = 0; i < batchFiles.length; i++) {
      const file = batchFiles[i];
      try {
        const text = await extractTextFromFile(file);
        
        // Validate token limit before sending
        const tokenValidation = validateTokenLimit(text);
        if (!tokenValidation.valid) {
          errors.push(
            `${file.name}: Too large - ${tokenValidation.tokens.toLocaleString()} tokens ` +
            `(limit: ${tokenValidation.limit.toLocaleString()} tokens)`
          );
          continue;
        }
        
        const res = await fetch('/api/runs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workflowId: selectedWorkflow,
            input: text,
            inputType: 'file',
            fileName: file.name,
            fileType: file.type,
          }),
        });
        
        if (res.ok) {
          const data = await res.json();
          results.push(data);
        } else {
          errors.push(`${file.name}: ${res.statusText}`);
        }
      } catch (err) {
        console.error(`Failed to process ${file.name}:`, err);
        errors.push(`${file.name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }
    
    setIsRunning(false);
    setBatchFiles([]);
    
    if (results.length > 0) {
      setCurrentOutputs(results);
      setShowCurrentOutputs(true);
      loadRecentRuns();
    }
    
    if (errors.length > 0) {
      setError(`Warning: ${errors.length} files failed: ${errors.join(', ')}`);
    }
    
    setTimeout(() => {
      setSuccessMessage('');
      setError('');
    }, 7000);
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

    // Check token limit
    const tokenValidation = validateTokenLimit(inputText);
    if (!tokenValidation.valid) {
      setError(
        `Input is too large for processing. Estimated ${tokenValidation.tokens.toLocaleString()} tokens, ` +
        `but limit is ${tokenValidation.limit.toLocaleString()} tokens per request. ` +
        `Please reduce your input size by approximately ${Math.ceil((tokenValidation.tokens - tokenValidation.limit) / tokenValidation.tokens * 100)}%.`
      );
      return;
    }

    setIsRunning(true);
    
    // Get workflow to track steps
    const workflow = workflows.find(w => w._id?.toString() === selectedWorkflow);
    if (workflow) {
      setTotalSteps(workflow.steps.length);
      setCurrentStep(0);
      setCurrentStepName('Preparing...');
      
      // Simulate progress updates
      const stepDuration = 1500; // 1.5 seconds per step estimate
      const progressInterval = setInterval(() => {
        setCurrentStep(prev => {
          const next = prev + 1;
          if (next <= (workflow.steps.length)) {
            if (next === workflow.steps.length) {
              setCurrentStepName('Finalizing...');
            } else {
              const stepLabel = STEP_TYPES.find(s => s.value === workflow.steps[next].id)?.label || workflow.steps[next].name;
              setCurrentStepName(stepLabel);
            }
            return next;
          }
          return prev;
        });
      }, stepDuration);
      
      // Store interval ID to clear later
      (window as any).progressInterval = progressInterval;
    }

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
        setCurrentOutputs([data]);
        setShowCurrentOutputs(true);
        loadRecentRuns();
        setCurrentRun(data);
        setCurrentStep(totalSteps);
        setCurrentStepName('Complete!');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setError(data.error || 'Failed to run workflow');
      }
    } catch (err) {
      setError('Failed to run workflow: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      // Clear progress interval
      if ((window as any).progressInterval) {
        clearInterval((window as any).progressInterval);
        (window as any).progressInterval = null;
      }
      setIsRunning(false);
      setTimeout(() => {
        setCurrentStep(0);
        setTotalSteps(0);
        setCurrentStepName('');
      }, 2000);
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

        {/* Workflow Templates */}
        <div className="mb-6 space-y-3">
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className="w-full p-4 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg hover:from-purple-600 hover:to-indigo-700 transition font-semibold shadow-lg flex items-center justify-center gap-2"
          >
            {showTemplates ? 'Hide Templates' : 'Use Workflow Templates'}
          </button>
          
          <label className="block">
            <div className="w-full p-3 bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-lg hover:from-green-600 hover:to-teal-700 transition font-semibold shadow-lg flex items-center justify-center gap-2 cursor-pointer">
              Import Workflow (JSON)
            </div>
            <input
              type="file"
              accept=".json"
              onChange={handleImportWorkflow}
              className="hidden"
            />
          </label>
          
          {showTemplates && (
            <div className="mt-4 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {WORKFLOW_TEMPLATES.map((template, index) => (
                <div
                  key={index}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border-2 border-purple-200 dark:border-purple-900 hover:border-purple-400 dark:hover:border-purple-700 transition cursor-pointer"
                  onClick={() => applyTemplate(template)}
                >
                  <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                    {template.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {template.description}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {template.steps.map((step, idx) => {
                      const stepLabel = STEP_TYPES.find(s => s.value === step)?.label || step;
                      return (
                        <span
                          key={idx}
                          className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded"
                        >
                          {idx + 1}. {stepLabel}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {/* Create Workflow */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                1. {editingWorkflowId ? 'Edit' : 'Create'} Workflow
              </h2>
              <button
                onClick={() => editingWorkflowId ? handleCancelEdit() : setShowCreateForm(!showCreateForm)}
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
                  {editingWorkflowId ? 'Update Workflow' : 'Create Workflow'}
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
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                            {wf.name}
                          </h3>
                          {wf.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                              {wf.description}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2 ml-2">
                          <button
                            onClick={() => handleExportWorkflow(wf)}
                            className="p-1.5 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900 rounded transition"
                            title="Export as JSON"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => handleEditWorkflow(wf)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 rounded transition"
                            title="Edit"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDuplicateWorkflow(wf)}
                            className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900 rounded transition"
                            title="Duplicate"
                          >
                            Copy
                          </button>
                          <button
                            onClick={() => handleDeleteWorkflow(wf._id?.toString() || '')}
                            className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded transition"
                            title="Delete"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex flex-wrap gap-2 flex-1">
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
                          <button
                            onClick={() => setVisualizingWorkflowId(
                              visualizingWorkflowId === wf._id?.toString() ? null : wf._id?.toString() || null
                            )}
                            className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition ml-2"
                            title="Toggle Flowchart"
                          >
                            {visualizingWorkflowId === wf._id?.toString() ? 'Hide Flow' : 'Show Flow'}
                          </button>
                        </div>
                        
                        {visualizingWorkflowId === wf._id?.toString() && (
                          <div className="mt-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-indigo-200 dark:border-indigo-800">
                            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                              Workflow Flowchart
                            </h4>
                            <div className="overflow-x-auto">
                              <svg 
                                className="mx-auto" 
                                width={Math.max(600, wf.steps.length * 150)} 
                                height="200"
                              >
                                {/* Define arrow marker */}
                                <defs>
                                  <marker
                                    id="arrowhead"
                                    markerWidth="10"
                                    markerHeight="10"
                                    refX="9"
                                    refY="3"
                                    orient="auto"
                                  >
                                    <polygon points="0 0, 10 3, 0 6" fill="#6366f1" />
                                  </marker>
                                </defs>
                                
                                {/* Start circle */}
                                <circle cx="50" cy="100" r="20" fill="#10b981" />
                                <text x="50" y="105" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">
                                  Start
                                </text>
                                
                                {/* Arrow from start to first step */}
                                {wf.steps.length > 0 && (
                                  <line
                                    x1="70"
                                    y1="100"
                                    x2="100"
                                    y2="100"
                                    stroke="#6366f1"
                                    strokeWidth="2"
                                    markerEnd="url(#arrowhead)"
                                  />
                                )}
                                
                                {/* Steps */}
                                {wf.steps.map((step, idx) => {
                                  const x = 150 + idx * 150;
                                  const y = 100;
                                  const stepLabel = step.name.length > 12 
                                    ? step.name.substring(0, 10) + '...' 
                                    : step.name;
                                  
                                  return (
                                    <g key={step.id}>
                                      {/* Step box */}
                                      <rect
                                        x={x - 50}
                                        y={y - 30}
                                        width="100"
                                        height="60"
                                        rx="8"
                                        fill="#6366f1"
                                        stroke="#4f46e5"
                                        strokeWidth="2"
                                      />
                                      <text
                                        x={x}
                                        y={y - 10}
                                        textAnchor="middle"
                                        fill="white"
                                        fontSize="10"
                                        fontWeight="bold"
                                      >
                                        Step {idx + 1}
                                      </text>
                                      <text
                                        x={x}
                                        y={y + 10}
                                        textAnchor="middle"
                                        fill="white"
                                        fontSize="11"
                                      >
                                        {stepLabel}
                                      </text>
                                      
                                      {/* Arrow to next step */}
                                      {idx < wf.steps.length - 1 && (
                                        <line
                                          x1={x + 50}
                                          y1={y}
                                          x2={x + 100}
                                          y2={y}
                                          stroke="#6366f1"
                                          strokeWidth="2"
                                          markerEnd="url(#arrowhead)"
                                        />
                                      )}
                                    </g>
                                  );
                                })}
                                
                                {/* End circle */}
                                {wf.steps.length > 0 && (
                                  <>
                                    <line
                                      x1={150 + (wf.steps.length - 1) * 150 + 50}
                                      y1="100"
                                      x2={150 + (wf.steps.length - 1) * 150 + 80}
                                      y2="100"
                                      stroke="#6366f1"
                                      strokeWidth="2"
                                      markerEnd="url(#arrowhead)"
                                    />
                                    <circle 
                                      cx={150 + (wf.steps.length - 1) * 150 + 110} 
                                      cy="100" 
                                      r="20" 
                                      fill="#ef4444" 
                                    />
                                    <text 
                                      x={150 + (wf.steps.length - 1) * 150 + 110} 
                                      y="105" 
                                      textAnchor="middle" 
                                      fill="white" 
                                      fontSize="12" 
                                      fontWeight="bold"
                                    >
                                      End
                                    </text>
                                  </>
                                )}
                              </svg>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                              Visual representation of workflow execution flow
                            </p>
                          </div>
                        )}
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
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {inputText.length} / {MAX_INPUT_CHARS} characters
                    </p>
                    {inputText.length > 0 && (() => {
                      const validation = validateTokenLimit(inputText);
                      return (
                        <p className={`text-xs font-medium ${
                          validation.valid 
                            ? 'text-green-600 dark:text-green-400' 
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          {validation.tokens.toLocaleString()} / {validation.limit.toLocaleString()} tokens
                          {!validation.valid && ' (Too large!)'}
                        </p>
                      );
                    })()}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setBatchMode(false)}
                      className={`flex-1 px-3 py-1.5 text-sm rounded border transition ${
                        !batchMode
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-medium'
                          : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      Single File
                    </button>
                    <button
                      type="button"
                      onClick={() => setBatchMode(true)}
                      className={`flex-1 px-3 py-1.5 text-sm rounded border transition ${
                        batchMode
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-medium'
                          : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      Batch (Max 10)
                    </button>
                  </div>
                  
                  {!batchMode ? (
                    <>
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
                        <div className="mt-2 space-y-2">
                          <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
                            <p className="text-sm text-green-700 dark:text-green-300">
                              {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                            </p>
                          </div>
                          
                          {/* File Preview */}
                          {inputText && (
                            <div className="border border-blue-200 dark:border-blue-800 rounded-lg overflow-hidden">
                              <div className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/30">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const preview = document.getElementById('file-preview');
                                    if (preview) {
                                      preview.classList.toggle('hidden');
                                    }
                                  }}
                                  className="text-blue-700 dark:text-blue-300 text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/50 transition flex items-center gap-2"
                                >
                                  <span>Preview Extracted Text</span>
                                  <span className="text-xs">({inputText.length} chars)</span>
                                </button>
                                {(() => {
                                  const validation = validateTokenLimit(inputText);
                                  return (
                                    <span className={`text-xs font-medium px-2 py-1 rounded ${
                                      validation.valid 
                                        ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' 
                                        : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                                    }`}>
                                      {validation.tokens.toLocaleString()} tokens
                                      {!validation.valid && ' (Too large!)'}
                                    </span>
                                  );
                                })()}
                              </div>
                              <div id="file-preview" className="hidden p-3 bg-white dark:bg-gray-900 max-h-48 overflow-y-auto">
                                <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
                                  {inputText.substring(0, 1000)}
                                  {inputText.length > 1000 && '...\n\n(Showing first 1000 characters)'}
                                </pre>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                        Upload Multiple Files (max 10) *
                      </label>
                      <input
                        type="file"
                        accept={getSupportedFileTypes()}
                        multiple
                        onChange={handleBatchFilesChange}
                        className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Select up to 10 files for batch processing
                      </p>
                      {batchFiles.length > 0 && (
                        <div className="mt-2 p-3 bg-purple-50 dark:bg-purple-900/20 rounded border border-purple-200 dark:border-purple-800 space-y-1">
                          <p className="text-sm font-semibold text-purple-700 dark:text-purple-300 mb-2">
                            {batchFiles.length} files selected:
                          </p>
                          {batchFiles.map((file, idx) => (
                            <p key={idx} className="text-xs text-purple-600 dark:text-purple-400">
                              • {file.name} ({(file.size / 1024).toFixed(2)} KB)
                            </p>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {batchMode ? (
                <button
                  type="button"
                  onClick={handleBatchRun}
                  disabled={isRunning || batchFiles.length === 0}
                  className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
                >
                  {isRunning ? 'Processing Batch...' : `Run Batch (${batchFiles.length} files)`}
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isRunning}
                  className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
                >
                  {isRunning ? 'Running...' : 'Run Workflow'}
                </button>
              )}
            </form>
          </div>
        </div>

        {/* Current Output */}
        {showCurrentOutputs && currentOutputs.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border-2 border-indigo-500">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                  3. Current Output ({currentOutputs.length} {currentOutputs.length === 1 ? 'Result' : 'Results'})
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Results from your most recent workflow execution
                </p>
              </div>
              <button
                onClick={() => setShowCurrentOutputs(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-xl"
                title="Close"
              >
                ×
              </button>
            </div>

            <div className="space-y-3">
              {currentOutputs.map((output, idx) => (
                <div
                  key={output._id?.toString() || idx}
                  className="p-4 border-2 border-indigo-200 dark:border-indigo-800 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 hover:border-indigo-400 dark:hover:border-indigo-600 transition cursor-pointer"
                  onClick={() => setCurrentRun(output)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {output.workflowName}
                        {currentOutputs.length > 1 && (
                          <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                            ({idx + 1} of {currentOutputs.length})
                          </span>
                        )}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(output.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        output.status === 'success'
                          ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                          : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
                      }`}
                    >
                      {output.status}
                    </span>
                  </div>
                  
                  <div className="flex gap-2 mb-2">
                    <span className="text-xs px-2 py-1 bg-white dark:bg-gray-700 rounded">
                      {output.results.length} steps
                    </span>
                    <span className="text-xs px-2 py-1 bg-white dark:bg-gray-700 rounded">
                      {output.totalDuration}ms
                    </span>
                    {output.fileName && (
                      <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                        File: {output.fileName}
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
                    Click to view full results →
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Runs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              {showCurrentOutputs && currentOutputs.length > 0 ? '4' : '3'}. Recent Runs (Last 5)
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
                        File: {run.fileName}
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

      {isRunning && <LoadingSpinner currentStep={currentStep} totalSteps={totalSteps} stepName={currentStepName} />}
      <ResultModal run={currentRun} onClose={() => setCurrentRun(null)} />
    </div>
  );
}
