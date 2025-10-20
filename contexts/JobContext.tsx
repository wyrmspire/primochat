import React, { createContext, useState, useContext, ReactNode } from 'react';
import type { JobDocument } from '../types';

interface JobContextType {
  activeJob: JobDocument | null;
  setActiveJob: React.Dispatch<React.SetStateAction<JobDocument | null>>;
}

const JobContext = createContext<JobContextType | undefined>(undefined);

export const JobProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeJob, setActiveJob] = useState<JobDocument | null>(null);

  return (
    <JobContext.Provider value={{ activeJob, setActiveJob }}>
      {children}
    </JobContext.Provider>
  );
};

export const useJob = (): JobContextType => {
  const context = useContext(JobContext);
  if (!context) {
    throw new Error('useJob must be used within a JobProvider');
  }
  return context;
};