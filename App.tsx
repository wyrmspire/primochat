import React from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { BotIcon, ExclamationTriangleIcon } from './components/icons';
import { JobProvider } from './contexts/JobContext';
import { FileManager } from './components/FileManager';
import { TabbedView } from './components/TabbedView';
import { ContextInspector } from './components/ContextInspector';
import { API_KEY } from './services/geminiService';

const App: React.FC = () => {

  if (!API_KEY) {
    return (
      <div className="h-screen bg-gray-900 text-gray-200 flex flex-col items-center justify-center font-sans">
        <div className="bg-red-900/50 border border-red-700 p-8 rounded-lg text-center max-w-md">
          <ExclamationTriangleIcon className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-red-300 mb-2">Configuration Error</h1>
          <p className="text-red-200">
            The <code className="bg-red-800/50 px-1 py-0.5 rounded font-mono">API_KEY</code> is not set.
          </p>
          <p className="text-gray-400 mt-4 text-sm">
            Please ensure the API_KEY is correctly configured in your environment to use the Primordia Agent.
          </p>
        </div>
      </div>
    );
  }

  return (
    <JobProvider>
      <div className="h-screen bg-gray-900 text-gray-200 flex flex-col font-sans overflow-hidden">
        <header className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 p-4 flex-shrink-0 z-10">
          <div className="container mx-auto flex items-center gap-3">
            <BotIcon className="w-8 h-8 text-cyan-400" />
            <h1 className="text-2xl font-bold tracking-wider">Primordia Agent</h1>
          </div>
        </header>
        <main className="flex-grow flex min-h-0">
          <PanelGroup direction="horizontal" className="flex-grow">
            <Panel defaultSize={20} minSize={15} className="flex flex-col bg-gray-800/50">
              <FileManager />
            </Panel>
            <PanelResizeHandle className="w-1.5 bg-gray-800 hover:bg-cyan-600 active:bg-cyan-500 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 ring-offset-2 ring-offset-gray-900" />
            <Panel defaultSize={55} minSize={30} className="flex flex-col">
              <TabbedView />
            </Panel>
            <PanelResizeHandle className="w-1.5 bg-gray-800 hover:bg-cyan-600 active:bg-cyan-500 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 ring-offset-2 ring-offset-gray-900" />
            <Panel defaultSize={25} minSize={20} className="flex flex-col bg-gray-800/50">
              <ContextInspector />
            </Panel>
          </PanelGroup>
        </main>
      </div>
    </JobProvider>
  );
};

export default App;