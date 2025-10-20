import React, { useState } from 'react';
import { ChatInterface } from './ChatInterface';
import { LogViewer } from './LogViewer';
import { BotIcon, LogsIcon } from './icons';

type ActiveTab = 'chat' | 'logs';

export const TabbedView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('chat');

  const getTabClass = (tabName: ActiveTab) => 
    `flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors duration-200 ${
      activeTab === tabName
        ? 'border-cyan-400 text-cyan-400'
        : 'border-transparent text-gray-400 hover:text-white hover:border-gray-500'
    }`;

  return (
    <div className="flex flex-col h-full bg-gray-800">
      <div className="flex-shrink-0 border-b border-gray-700">
        <nav className="flex space-x-2" aria-label="Tabs">
          <button className={getTabClass('chat')} onClick={() => setActiveTab('chat')}>
            <BotIcon className="w-5 h-5" />
            <span>Agent Chat</span>
          </button>
          <button className={getTabClass('logs')} onClick={() => setActiveTab('logs')}>
            <LogsIcon className="w-5 h-5" />
            <span>Primordia Logs</span>
          </button>
        </nav>
      </div>
      <div className="flex-grow min-h-0">
        {activeTab === 'chat' && <ChatInterface />}
        {activeTab === 'logs' && <LogViewer />}
      </div>
    </div>
  );
};