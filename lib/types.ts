import { ObjectId } from 'mongodb';

export type StepType = 
  | 'clean' 
  | 'summarize' 
  | 'extract' 
  | 'categorize'
  | 'translate'
  | 'sentiment'
  | 'keywords'
  | 'questions'
  | 'expand'
  | 'simplify'
  | 'bullet-points'
  | 'custom';

export interface WorkflowStep {
  id: string;
  type: StepType;
  name: string;
  order: number;
  customPrompt?: string; // For custom step type
}

export interface Workflow {
  _id?: ObjectId;
  name: string;
  description: string;
  steps: WorkflowStep[];
  createdAt: Date;
  updatedAt: Date;
}

export interface StepResult {
  stepId: string;
  stepName: string;
  input: string;
  output: string;
  duration: number;
  status: 'success' | 'error';
  error?: string;
}

export interface WorkflowRun {
  _id?: ObjectId;
  workflowId: string;
  workflowName: string;
  input: string;
  inputType?: 'text' | 'file';
  fileName?: string;
  fileType?: string;
  results: StepResult[];
  totalDuration: number;
  status: 'success' | 'error' | 'running';
  createdAt: Date;
}
