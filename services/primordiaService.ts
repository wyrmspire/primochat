
import { PRIMORDIA_API_BASE_URL } from '../constants';
import type { FileListResponse, JobDocument } from '../types';

const headers = {
  'Content-Type': 'application/json',
};

async function handleResponse<T,>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
  }
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json() as Promise<T>;
  }
  return response.text() as unknown as Promise<T>;
}

export const primordiaService = {
  listFiles: async (): Promise<FileListResponse> => {
    const response = await fetch(`${PRIMORDIA_API_BASE_URL}/files`);
    return handleResponse<FileListResponse>(response);
  },

  readFile: async (path: string): Promise<string> => {
    const response = await fetch(`${PRIMORDIA_API_BASE_URL}/file?path=${encodeURIComponent(path)}`);
    return handleResponse<string>(response);
  },

  writeFile: async (path: string, content: string): Promise<{ success: boolean; message: string }> => {
    const response = await fetch(`${PRIMORDIA_API_BASE_URL}/file`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ path, content }),
    });
    return handleResponse<{ success: boolean; message: string }>(response);
  },

  submitWorkspaceJob: async (type: string, name: string): Promise<{ jobId: string; message: string }> => {
    const response = await fetch(`${PRIMORDIA_API_BASE_URL}/workspace`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ type, name }),
    });
    // API returns 202 Accepted, handleResponse needs to account for this
    if (response.status !== 202) {
      const errorText = await response.text();
      throw new Error(`HTTP error! Expected status 202, got ${response.status}. Message: ${errorText}`);
    }
    return response.json();
  },

  getWorkspaceJobStatus: async (jobId: string): Promise<JobDocument> => {
    const response = await fetch(`${PRIMORDIA_API_BASE_URL}/workspace/status/${jobId}`);
    return handleResponse<JobDocument>(response);
  },

  proxyRequest: async (
    url: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' = 'GET',
    body?: object,
    reqHeaders?: object
  ): Promise<any> => {
    const response = await fetch(`${PRIMORDIA_API_BASE_URL}/workspace/proxy`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ url, method, body, headers: reqHeaders }),
    });
    return handleResponse<any>(response);
  },
};
