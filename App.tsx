
import React from 'react';
import { ChatInterface } from './components/ChatInterface';
import { BotIcon } from './components/icons';

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 flex flex-col font-sans">
      <header className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 p-4 sticky top-0 z-10">
        <div className="container mx-auto flex items-center gap-3">
          <BotIcon className="w-8 h-8 text-cyan-400" />
          <h1 className="text-2xl font-bold tracking-wider">Primordia Agent</h1>
        </div>
      </header>
      <main className="flex-grow container mx-auto p-4 flex flex-col">
        <ChatInterface />
      </main>
    </div>
  );
};

export default App;
