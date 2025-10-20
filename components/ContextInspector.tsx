import React, { useState } from 'react';
import { useJob } from '../contexts/JobContext';
import { tools } from '../services/geminiService';
import { CodeBracketSquareIcon, CubeIcon } from './icons';

const JsonViewer: React.FC<{ data: any }> = ({ data }) => {
  const content = JSON.stringify(data, null, 2);
  return (
    <pre className="bg-gray-900 text-xs text-gray-300 p-2 rounded-md overflow-x-auto whitespace-pre-wrap break-all">
      <code>{content}</code>
    </pre>
  );
};

export const ContextInspector: React.FC = () => {
    const { activeJob } = useJob();
    const [selectedToolName, setSelectedToolName] = useState<string | null>(tools.length > 0 ? tools[0].name : null);

    const selectedTool = tools.find(t => t.name === selectedToolName);

    return (
        <div className="flex flex-col h-full bg-gray-800/50 text-gray-300">
            <header className="p-3 border-b border-gray-700 flex-shrink-0">
                <h2 className="text-lg font-semibold tracking-wide">Context Inspector</h2>
            </header>
            
            <div className="flex-grow overflow-y-auto">
                {/* Job Inspector */}
                <div className="p-3 border-b border-gray-700">
                    <h3 className="flex items-center gap-2 text-md font-semibold text-cyan-400 mb-2">
                        <CubeIcon className="w-5 h-5" />
                        <span>Active Job Inspector</span>
                    </h3>
                    {activeJob ? (
                        <div className="space-y-2 text-sm">
                            <div><strong>Job ID:</strong> <span className="font-mono text-gray-400">{activeJob.jobId}</span></div>
                            <div><strong>Service:</strong> <span className="font-mono text-gray-400">{activeJob.blueprint.name}</span></div>
                            <div><strong>Status:</strong> <span className={`font-semibold ${
                                activeJob.status === 'SUCCESS' ? 'text-green-400' :
                                activeJob.status === 'FAILED' ? 'text-red-400' :
                                'text-yellow-400 animate-pulse'
                            }`}>{activeJob.status}</span></div>
                           {activeJob.outputs && <JsonViewer data={activeJob.outputs} />}
                           {activeJob.logs && activeJob.logs.length > 0 && 
                                <div>
                                    <strong>Logs:</strong>
                                    <pre className="bg-gray-900 text-xs text-gray-400 p-2 mt-1 rounded-md max-h-40 overflow-y-auto">
                                        {activeJob.logs.join('\n')}
                                    </pre>
                                </div>
                           }
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500">No active job.</p>
                    )}
                </div>

                {/* Tool Inspector */}
                <div className="p-3">
                    <h3 className="flex items-center gap-2 text-md font-semibold text-cyan-400 mb-2">
                        <CodeBracketSquareIcon className="w-5 h-5" />
                        <span>Tool Inspector</span>
                    </h3>
                    <div className="flex gap-2">
                        <div className="w-1/3 flex-shrink-0">
                             <ul className="text-sm space-y-1">
                                {tools.map(tool => (
                                    <li key={tool.name}>
                                        <button 
                                            onClick={() => setSelectedToolName(tool.name)}
                                            className={`w-full text-left px-2 py-1 rounded font-mono ${selectedToolName === tool.name ? 'bg-cyan-600/50 text-white' : 'hover:bg-gray-700'}`}
                                        >
                                            {tool.name}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="flex-grow min-w-0">
                            {selectedTool && (
                                <div className="space-y-2 text-sm bg-gray-700/50 p-3 rounded-lg">
                                    <p className="font-semibold text-base text-white">{selectedTool.name}</p>
                                    <p className="text-gray-400 italic">{selectedTool.description}</p>
                                    <p className="font-semibold mt-2">Parameters:</p>
                                    <JsonViewer data={selectedTool.parameters} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};