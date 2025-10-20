import { GoogleGenAI, FunctionDeclaration, Type, Chat, Part } from "@google/genai";

// FIX: Per project guidelines, the API key must be sourced from process.env.API_KEY.
// This also resolves the TypeScript error about 'import.meta.env'.
export const API_KEY = process.env.API_KEY;

export const tools: FunctionDeclaration[] = [
    {
        name: 'listFiles',
        description: 'Lists all files in the GCS workspace.',
        parameters: { type: Type.OBJECT, properties: {} },
    },
    {
        name: 'readFile',
        description: 'Reads the content of a specific file from the workspace.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                path: { type: Type.STRING, description: "Workspace-relative path of the file to read." },
            },
            required: ['path'],
        },
    },
    {
        name: 'writeFile',
        description: "Uploads or overwrites a source file in the GCS workspace. Use the convention 'runs/<service-name>/<filename>' for the path.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                path: { type: Type.STRING, description: "Workspace-relative path, e.g., 'runs/my-service/index.js'." },
                content: { type: Type.STRING, description: "Full text content to write to the file." },
            },
            required: ['path', 'content'],
        },
    },
    {
        name: 'submitWorkspaceJob',
        description: "Submits an asynchronous job, such as deploying a service. The 'name' must match the service name used in file paths. Use 'deploy-run-service' for standard Node.js services.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                type: { 
                    type: Type.STRING, 
                    description: "The type of job blueprint.",
                    enum: [
                        "scaffold-function",
                        "scaffold-run-service",
                        "deploy-function",
                        "deploy-run-service",
                        "create-and-deploy-function",
                        "create-and-deploy-run-service"
                    ]
                },
                name: { type: Type.STRING, description: "The name of the service/function." },
            },
            required: ['type', 'name'],
        },
    },
    {
        name: 'getWorkspaceJobStatus',
        description: 'Checks the status of a previously submitted asynchronous job.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                jobId: { type: Type.STRING, description: "The UUID of the job to check." },
            },
            required: ['jobId'],
        },
    },
    {
        name: 'proxyRequest',
        description: "Calls a deployed service through the secure proxy. The URL should be the internal service address, e.g., 'http://primordia-local-service-my-service:8080/path'.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                url: { type: Type.STRING, description: "Absolute URL to fetch via the proxy." },
                method: { 
                    type: Type.STRING, 
                    description: "HTTP method.",
                    enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
                },
                body: { type: Type.OBJECT, description: "JSON body for POST/PUT/PATCH requests." },
                headers: { type: Type.OBJECT, description: "Request headers." },
            },
            required: ['url'],
        },
    }
];

const systemInstruction = `You are an expert agent for the Primordia cloud orchestration service. Your goal is to help users build, deploy, and manage services by using the provided tools.
Follow the recommended asynchronous workflow:
1.  Write source files using 'writeFile'. You must write package.json, index.js, and handler.js for a Node.js service.
2.  Submit a deployment job using 'submitWorkspaceJob'.
3.  After submitting a job, inform the user you will poll for the status. The user interface will handle the polling automatically. Do not call 'getWorkspaceJobStatus' yourself; the UI takes care of it.
4.  Interact with the deployed service using 'proxyRequest'.
Always use a 'pls-' prefix for service names to be compatible with the local proxy, for example: 'pls-my-service'.
When creating a Node.js service, remember these key files:
-   package.json: Must include '"type": "module"'.
-   index.js: Must create an HTTP server listening on port 8080.
-   handler.js: Contains the core request handling logic.
Be concise and clear in your responses. When you use a tool, briefly explain what you are doing.`;

// Initialize the AI client and chat session only if the API key is provided.
// This prevents runtime errors and allows the UI to handle the missing key gracefully.
let chat: Chat | null = null;
if (API_KEY) {
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction,
            tools: [{ functionDeclarations: tools }],
        },
    });
}

export const geminiService = {
  isConfigured: () => !!chat,
  sendMessage: (message: string | Part[]) => {
    if (!chat) {
        throw new Error("Gemini service is not configured. API_KEY is missing.");
    }
    return chat.sendMessage({ message });
  },
};