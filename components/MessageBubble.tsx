
import React from 'react';
import type { ChatMessage } from '../types';
import { UserIcon, BotIcon, ToolIcon, CheckCircleIcon, ExclamationTriangleIcon, CodeBracketIcon } from './icons';

const JsonViewer: React.FC<{ data: any }> = ({ data }) => {
  let content: string;
  try {
    content = JSON.stringify(data, null, 2);
  } catch (error) {
    content = String(data);
  }

  return (
    <pre className="bg-gray-900 text-sm text-gray-300 p-3 rounded-md overflow-x-auto whitespace-pre-wrap break-all">
      <code>{content}</code>
    </pre>
  );
};

export const MessageBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const { role, text, toolCalls, toolResult } = message;

  const getBubbleClasses = () => {
    switch (role) {
      case 'user':
        return 'bg-blue-600 text-white self-end';
      case 'model':
        return 'bg-gray-700 text-gray-200 self-start';
      case 'tool':
        return `bg-gray-600 text-gray-300 self-start border-l-4 ${toolResult?.isError ? 'border-red-500' : 'border-green-500'}`;
      default:
        return 'bg-gray-700 text-gray-200 self-start';
    }
  };
  
  const getIcon = () => {
     switch (role) {
      case 'user':
        return <UserIcon className="w-6 h-6 text-white" />;
      case 'model':
        return <BotIcon className="w-6 h-6 text-cyan-400" />;
      case 'tool':
        return toolResult?.isError 
          ? <ExclamationTriangleIcon className="w-6 h-6 text-red-400" /> 
          : <CheckCircleIcon className="w-6 h-6 text-green-400" />;
      default:
        return null;
    }
  }

  const wrapperClasses = role === 'user' ? 'justify-end' : 'justify-start';

  return (
    <div className={`flex items-start gap-3 max-w-full md:max-w-[85%] ${wrapperClasses}`}>
      {role !== 'user' && <div className="flex-shrink-0 mt-1">{getIcon()}</div>}
      <div className={`rounded-lg p-3 ${getBubbleClasses()} flex flex-col gap-2`}>
        <p className="whitespace-pre-wrap">{text}</p>
        
        {toolCalls && (
          <div className="mt-2 space-y-2">
            {toolCalls.map((call, index) => (
              <div key={index} className="bg-gray-800/50 p-3 rounded-lg border border-gray-600">
                <div className="flex items-center gap-2 text-sm text-cyan-300 font-mono">
                   <ToolIcon className="w-4 h-4" />
                   <span>{call.name}</span>
                </div>
                <JsonViewer data={call.args} />
              </div>
            ))}
          </div>
        )}

        {toolResult && (
           <div className="mt-2 bg-gray-800/50 p-3 rounded-lg border border-gray-600">
              <div className="flex items-center gap-2 text-sm text-gray-400 font-mono">
                <CodeBracketIcon className="w-4 h-4" />
                <span>Tool Result</span>
              </div>
              <JsonViewer data={toolResult.response} />
           </div>
        )}

      </div>
       {role === 'user' && <div className="flex-shrink-0 mt-1">{getIcon()}</div>}
    </div>
  );
};
