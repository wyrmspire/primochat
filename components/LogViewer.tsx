import React, { useState, useEffect, useRef } from 'react';
import { LogsIcon } from './icons';

const logLevels = ['INFO', 'WARN', 'ERROR', 'DEBUG'];
const logMessages = [
  'Service initialized successfully.',
  'Received request on /api/users',
  'Connecting to database...',
  'Database connection established.',
  'User authenticated: user@example.com',
  'File not found: /data/config.json',
  'Timeout while fetching external resource.',
  'Processing batch job #123',
  'Memory usage: 58.7MB',
  'Deployment started for pls-hello-world',
];

const generateLogLine = (): string => {
  const timestamp = new Date().toISOString();
  const level = logLevels[Math.floor(Math.random() * logLevels.length)];
  const message = logMessages[Math.floor(Math.random() * logMessages.length)];
  return `${timestamp} [${level}] ${message}`;
};

export const LogViewer: React.FC = () => {
  const [logs, setLogs] = useState<string[]>(() => Array.from({ length: 20 }, generateLogLine));
  const [filter, setFilter] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isPaused) return;

    const intervalId = setInterval(() => {
      setLogs(prevLogs => [...prevLogs, generateLogLine()]);
    }, 2000);

    return () => clearInterval(intervalId);
  }, [isPaused]);

  useEffect(() => {
    if (!isPaused && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, isPaused]);

  const filteredLogs = logs.filter(log => log.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="flex flex-col h-full bg-gray-900 text-gray-300 font-mono">
      <header className="p-3 border-b border-gray-700 flex-shrink-0 flex items-center gap-4 bg-gray-800">
        <input
          type="text"
          placeholder="Filter logs..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="flex-grow bg-gray-700 text-gray-200 px-3 py-1.5 rounded-md text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none"
        />
        <div className="flex items-center gap-2">
            <button
                onClick={() => setIsPaused(!isPaused)}
                className={`px-3 py-1.5 text-sm rounded-md ${isPaused ? 'bg-green-600 hover:bg-green-500' : 'bg-gray-600 hover:bg-gray-500'}`}
            >
                {isPaused ? 'Resume' : 'Pause'}
            </button>
            <button
                onClick={() => setLogs([])}
                className="px-3 py-1.5 text-sm rounded-md bg-red-700 hover:bg-red-600"
            >
                Clear
            </button>
        </div>
      </header>
      <div ref={logContainerRef} className="flex-grow p-4 overflow-y-auto text-sm">
        {filteredLogs.map((log, index) => (
          <div key={index} className="whitespace-pre-wrap break-all">
            <span className="text-gray-500 mr-2">{index + 1}</span>
            <span className={log.includes('[ERROR]') ? 'text-red-400' : log.includes('[WARN]') ? 'text-yellow-400' : 'text-gray-300'}>
              {log}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};