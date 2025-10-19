
import type { FunctionCall } from '@google/genai';

export type MessageRole = 'user' | 'model' | 'tool';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  text: string;
  toolCalls?: FunctionCall[];
  toolResult?: {
    id: string;
    response: any;
    isError?: boolean;
  };
}

export type JobStatus = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED';

export interface JobBlueprint {
  type: string;
  name: string;
}

export interface JobDocument {
  jobId: string;
  status: JobStatus;
  receivedAt: string;
  completedAt?: string;
  blueprint: JobBlueprint;
  logs: string[];
  outputs?: any;
}

export interface FileListResponse {
  files: string[];
}
