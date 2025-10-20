import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GenerateContentResponse, FunctionCall, Part } from '@google/genai';
import { geminiService } from '../services/geminiService';
import { primordiaService } from '../services/primordiaService';
import type { ChatMessage, JobDocument } from '../types';
import { MessageBubble } from './MessageBubble';
import { SendIcon } from './icons';
import { Spinner } from './Spinner';
import { useJob } from '../contexts/JobContext';

export const ChatInterface: React.FC = () => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { setActiveJob } = useJob();

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(scrollToBottom, [messages]);
    
    useEffect(() => {
        if (!geminiService.isConfigured()) {
            setMessages([{
                id: 'config-error',
                role: 'model',
                text: 'The Gemini service is not configured. Please check your API key.'
            }]);
        }
    }, []);

    useEffect(() => {
        // Cleanup job context on unmount
        return () => {
            setActiveJob(null);
        };
    }, [setActiveJob]);

    const functionCallHandler = useCallback(async (toolCalls: FunctionCall[]): Promise<{ toolResultParts: Part[], toolResultMessages: ChatMessage[] }> => {
        let toolResultParts: Part[] = [];
        let toolResultMessages: ChatMessage[] = [];

        for (const call of toolCalls) {
            let result: any;
            let isError = false;
            try {
                switch (call.name) {
                    case 'listFiles':
                        result = await primordiaService.listFiles();
                        break;
                    case 'readFile':
                        result = await primordiaService.readFile(call.args.path as string);
                        break;
                    case 'writeFile':
                        result = await primordiaService.writeFile(call.args.path as string, call.args.content as string);
                        break;
                    case 'submitWorkspaceJob':
                        result = await primordiaService.submitWorkspaceJob(call.args.type as string, call.args.name as string);
                        break;
                    case 'getWorkspaceJobStatus':
                         result = await primordiaService.getWorkspaceJobStatus(call.args.jobId as string);
                        break;
                    case 'proxyRequest':
                        result = await primordiaService.proxyRequest(
                            call.args.url as string,
                            call.args.method as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
                            call.args.body as object,
                            call.args.headers as object
                        );
                        break;
                    default:
                        result = { error: `Unknown tool: ${call.name}` };
                        isError = true;
                }
            } catch (e: unknown) {
                console.error(`Error calling tool ${call.name}:`, e);
                // FIX: Properly handle unknown error types in catch block.
                const message = e instanceof Error ? e.message : String(e);
                result = { error: message || 'An unknown error occurred' };
                isError = true;
            }
    
            // FIX: The Part type for a tool response uses `functionResponse`.
            toolResultParts.push({
                functionResponse: {
                    name: call.name,
                    response: result,
                }
            });
    
            toolResultMessages.push({
                id: `tool-result-${call.id}-${Date.now()}`,
                role: 'tool',
                text: `Result for ${call.name}`,
                toolResult: { id: call.id, response: result, isError },
            });
        }
        return { toolResultParts, toolResultMessages };
    }, []);

    const processGeminiResponse = useCallback(async (response: GenerateContentResponse) => {
        const pollJobStatus = async (jobId: string, initialMessageId: string, originalToolResults: Part[]) => {
            let isDone = false;
            let finalStatus: JobDocument | null = null;
            
            while (!isDone) {
                try {
                    const statusDoc = await primordiaService.getWorkspaceJobStatus(jobId);
                    setActiveJob(statusDoc);
                    setMessages(prev => prev.map(msg => msg.id === initialMessageId ? { ...msg, text: `Polling job ${jobId}... Status: ${statusDoc.status}` } : msg));
    
                    if (statusDoc.status === 'SUCCESS' || statusDoc.status === 'FAILED') {
                        isDone = true;
                        finalStatus = statusDoc;
                    } else {
                        await new Promise(resolve => setTimeout(resolve, 3000));
                    }
                } catch (error) {
                    console.error('Polling failed:', error);
                    setMessages(prev => prev.map(msg => msg.id === initialMessageId ? { ...msg, text: `Error polling job ${jobId}. See console for details.` } : msg));
                    isDone = true;
                }
            }
            
            if (finalStatus) {
                setMessages(prev => prev.map(msg => msg.id === initialMessageId ? { ...msg, text: `Job ${jobId} finished with status: ${finalStatus?.status}` } : msg));
                
                // FIX: The Part type for a tool response uses `functionResponse`.
                // Filter out the original, provisional 'submitWorkspaceJob' result
                const otherToolResults = originalToolResults.filter(p => p.functionResponse?.name !== 'submitWorkspaceJob');
                // Create the new, final result for the job submission
                // FIX: Spread finalStatus into a new object to make it assignable to the `response` property.
                const jobStatusResultPart: Part = { functionResponse: { name: 'submitWorkspaceJob', response: { ...finalStatus } } };
                
                const allResults = [...otherToolResults, jobStatusResultPart];

                const finalResponse = await geminiService.sendMessage(allResults);
                await processGeminiResponse(finalResponse);
            } else {
                setActiveJob(null);
                setIsLoading(false);
            }
        };

        const toolCalls = response.functionCalls;
        const modelResponseText = response.text || '';
        
        const newMessages: ChatMessage[] = [];
        if (modelResponseText) {
            newMessages.push({ id: `model-${Date.now()}`, role: 'model', text: modelResponseText });
        }

        if (toolCalls && toolCalls.length > 0) {
            newMessages.push({ id: `model-tool-${Date.now()}`, role: 'model', text: "Using tools...", toolCalls });
            if (newMessages.length > 0) {
              setMessages(prev => [...prev, ...newMessages]);
            }

            const { toolResultParts, toolResultMessages } = await functionCallHandler(toolCalls);
            setMessages(prev => [...prev, ...toolResultMessages]);

            const jobSubmissionCall = toolCalls.find(tc => tc.name === 'submitWorkspaceJob');
            // FIX: The Part type for a tool response uses `functionResponse`.
            const jobSubmissionResult = toolResultParts.find(p => p.functionResponse?.name === 'submitWorkspaceJob');

            // FIX: The Part type for a tool response uses `functionResponse`.
            if (jobSubmissionCall && jobSubmissionResult?.functionResponse?.response?.jobId) {
                // FIX: The Part type for a tool response uses `functionResponse`.
                const jobId = jobSubmissionResult.functionResponse.response.jobId;
                const pollMessageId = `polling-${jobId}-${Date.now()}`;
                setMessages(prev => [...prev, { id: pollMessageId, role: 'model', text: `Polling job ${jobId}...` }]);
                await pollJobStatus(jobId, pollMessageId, toolResultParts);
            } else {
                 const finalResponse = await geminiService.sendMessage(toolResultParts);
                 await processGeminiResponse(finalResponse);
            }
        } else {
             if (newMessages.length > 0) {
              setMessages(prev => [...prev, ...newMessages]);
            }
            setIsLoading(false);
        }
    }, [functionCallHandler, setActiveJob]);


    // FIX: Changed event type from React.FormEvent to React.SyntheticEvent to handle
    // both form onSubmit and textarea onKeyDown events with the same handler.
    const handleSubmit = async (e: React.SyntheticEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading || !geminiService.isConfigured()) return;

        const userMessage: ChatMessage = { id: `user-${Date.now()}`, role: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        const currentInput = input;
        setInput('');
        setIsLoading(true);

        try {
            const response = await geminiService.sendMessage(currentInput);
            await processGeminiResponse(response);
        } catch (error) {
            console.error("Failed to send message:", error);
            // FIX: The `error` variable is of type `unknown` and must be converted to a string before use.
            const message = error instanceof Error ? error.message : String(error);
            setMessages(prev => [...prev, { id: `error-${Date.now()}`, role: 'model', text: `Sorry, something went wrong: ${message}` }]);
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full w-full bg-gray-800">
            <div className="flex-grow p-4 overflow-y-auto space-y-4">
                {messages.map((msg) => (
                    <MessageBubble key={msg.id} message={msg} />
                ))}
                {isLoading && (
                    <div className="flex justify-center items-center gap-2 p-4 text-gray-400">
                        <Spinner />
                        <span>Agent is thinking...</span>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
            <div className="p-4 border-t border-gray-700 bg-gray-800">
                <form onSubmit={handleSubmit} className="flex items-center gap-3">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSubmit(e);
                            }
                        }}
                        placeholder="e.g., Deploy a node service called pls-hello-world..."
                        className="flex-grow bg-gray-700 text-gray-200 p-3 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:outline-none resize-none"
                        rows={1}
                        disabled={isLoading || !geminiService.isConfigured()}
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !input.trim() || !geminiService.isConfigured()}
                        className="bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white p-3 rounded-full transition-colors duration-200"
                    >
                        <SendIcon className="w-6 h-6" />
                    </button>
                </form>
            </div>
        </div>
    );
};