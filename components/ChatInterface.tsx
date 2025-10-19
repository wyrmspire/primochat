
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GenerateContentResponse, FunctionCall } from '@google/genai';
import { geminiService } from '../services/geminiService';
import { primordiaService } from '../services/primordiaService';
import type { ChatMessage, JobDocument } from '../types';
import { MessageBubble } from './MessageBubble';
import { SendIcon } from './icons';
import { Spinner } from './Spinner';

export const ChatInterface: React.FC = () => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(scrollToBottom, [messages]);

    // FIX: Moved functionCallHandler inside the component to access state setters like setMessages.
    const functionCallHandler = useCallback(async (toolCalls: FunctionCall[]) => {
        let toolResultParts = [];
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
            } catch (e: any) {
                console.error(`Error calling tool ${call.name}:`, e);
                result = { error: e.message || 'An unknown error occurred' };
                isError = true;
            }
    
            toolResultParts.push({
                toolResponse: {
                    name: call.name,
                    response: result,
                }
            });
    
            // Add visual feedback for the tool call result
            setMessages(prev => [
                ...prev,
                {
                    id: `tool-result-${call.id}-${Date.now()}`,
                    role: 'tool',
                    text: `Result for ${call.name}`,
                    toolResult: { id: call.id, response: result, isError },
                }
            ]);
        }
        return toolResultParts;
    }, []);

    const pollJobStatus = useCallback(async (jobId: string, initialMessageId: string) => {
        let isDone = false;
        let finalStatus: JobDocument | null = null;
        
        // buildHistory is defined below, but it's a stable function definition
        // processGeminiResponse is also defined below, this can cause stale closures but is outside the scope of the current fix.
        // For now we will rely on function hoisting for processGeminiResponse.

        while (!isDone) {
            try {
                const statusDoc = await primordiaService.getWorkspaceJobStatus(jobId);
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
            
            // Send final status back to Gemini
            const toolResultPart = { toolResponse: { name: 'getWorkspaceJobStatus', response: finalStatus } };
            const history = buildHistory();
            const response = await geminiService.sendMessageWithHistory(history, JSON.stringify(toolResultPart));
            processGeminiResponse(response);
        }
    }, []);

    const processGeminiResponse = useCallback(async (response: GenerateContentResponse) => {
        const toolCalls = response.functionCalls;
        
        const modelResponseText = response.text || '';
        if (modelResponseText) {
            setMessages(prev => [...prev, { id: `model-${Date.now()}`, role: 'model', text: modelResponseText }]);
        }

        if (toolCalls && toolCalls.length > 0) {
            setMessages(prev => [...prev, { id: `model-tool-${Date.now()}`, role: 'model', text: "Using tools...", toolCalls }]);
            
            const toolResultParts = await functionCallHandler(toolCalls);

            // Special handling for job submission to start polling
            const jobSubmissionCall = toolCalls.find(tc => tc.name === 'submitWorkspaceJob');
            const jobSubmissionResult = toolResultParts.find(p => p.toolResponse.name === 'submitWorkspaceJob');

            if (jobSubmissionCall && jobSubmissionResult?.toolResponse.response?.jobId) {
                const jobId = jobSubmissionResult.toolResponse.response.jobId;
                const pollMessageId = `polling-${jobId}-${Date.now()}`;
                setMessages(prev => [...prev, { id: pollMessageId, role: 'model', text: `Polling job ${jobId}...` }]);
                pollJobStatus(jobId, pollMessageId);
            } else {
                 const history = buildHistory();
                 const finalResponse = await geminiService.sendMessageWithHistory(history, JSON.stringify({toolCallResponse: {parts: toolResultParts}}));
                 processGeminiResponse(finalResponse);
            }
        } else {
            setIsLoading(false);
        }
    }, [pollJobStatus, functionCallHandler]);

    const buildHistory = () => {
        return messages.map(msg => {
            const parts: any[] = [{ text: msg.text }];
            if (msg.toolCalls) {
                parts.push({ functionCall: msg.toolCalls[0] });
            }
            if (msg.toolResult) {
                parts.push({ toolResponse: { name: 'function-response', response: msg.toolResult.response } });
            }
            return {
                role: msg.role === 'tool' ? 'model' : msg.role, // Gemini expects 'model' for tool results
                parts: parts.filter(p => p.text !== undefined || p.functionCall || p.toolResponse)
            };
        }).filter(h => h.parts.length > 0);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: ChatMessage = { id: `user-${Date.now()}`, role: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const history = buildHistory();
            const response = await geminiService.sendMessageWithHistory(history, input);
            await processGeminiResponse(response);
        } catch (error) {
            console.error("Failed to send message:", error);
            setMessages(prev => [...prev, { id: `error-${Date.now()}`, role: 'model', text: "Sorry, something went wrong." }]);
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-100px)] w-full max-w-4xl mx-auto bg-gray-800 rounded-lg shadow-2xl">
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
            <div className="p-4 border-t border-gray-700">
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
                        placeholder="e.g., Deploy a node service called pls-hello-world that returns { message: 'hello' }"
                        className="flex-grow bg-gray-700 text-gray-200 p-3 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:outline-none resize-none"
                        rows={1}
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white p-3 rounded-full transition-colors duration-200"
                    >
                        <SendIcon className="w-6 h-6" />
                    </button>
                </form>
            </div>
        </div>
    );
};
