import React, { useState, useMemo } from 'react';
import { FolderIcon, FileIcon, PlusIcon, RefreshIcon, ChevronRightIcon, ChevronDownIcon } from './icons';

interface FileNode {
  name: string;
  children?: { [key: string]: FileNode };
}

interface TreeNodeProps {
  name: string;
  node: FileNode;
  level: number;
}

const mockFilePaths = [
  'runs/pls-hello-world/package.json',
  'runs/pls-hello-world/index.js',
  'runs/pls-hello-world/handler.js',
  'runs/pls-stateful-counter/package.json',
  'runs/pls-stateful-counter/index.js',
  'runs/pls-stateful-counter/handler.js',
  'config/proxy.json',
  'README.md',
];

const buildFileTree = (paths: string[]): FileNode => {
    const root: FileNode = { name: 'root', children: {} };
    paths.forEach(path => {
        let currentLevel = root.children!;
        path.split('/').forEach((part, index, arr) => {
            if (!currentLevel[part]) {
                currentLevel[part] = { name: part, children: index === arr.length - 1 ? undefined : {} };
            }
            if(currentLevel[part].children) {
              currentLevel = currentLevel[part].children!;
            }
        });
    });
    return root;
};

const TreeNode: React.FC<TreeNodeProps> = ({ name, node, level }) => {
    const isDirectory = !!node.children;
    const [isOpen, setIsOpen] = useState(level < 2);

    return (
        <div>
            <div 
                className="flex items-center p-1.5 rounded-md hover:bg-gray-700 cursor-pointer text-sm"
                style={{ paddingLeft: `${level * 1.5}rem` }}
                onClick={() => isDirectory && setIsOpen(!isOpen)}
            >
                {isDirectory ? (
                    <>
                        {isOpen ? <ChevronDownIcon className="w-4 h-4 mr-1 flex-shrink-0" /> : <ChevronRightIcon className="w-4 h-4 mr-1 flex-shrink-0" />}
                        <FolderIcon className="w-5 h-5 mr-2 text-cyan-400 flex-shrink-0" />
                    </>
                ) : (
                    <FileIcon className="w-5 h-5 mr-2 text-gray-400 flex-shrink-0 ml-[20px]" />
                )}
                <span className="truncate">{name}</span>
            </div>
            {isOpen && isDirectory && (
                <div>
                    {Object.entries(node.children!).map(([childName, childNode]) => (
                        <TreeNode key={childName} name={childName} node={childNode} level={level + 1} />
                    ))}
                </div>
            )}
        </div>
    );
};


export const FileManager: React.FC = () => {
    const fileTree = useMemo(() => buildFileTree(mockFilePaths), []);

    return (
        <div className="flex flex-col h-full bg-gray-800/50">
            <header className="p-3 border-b border-gray-700 flex-shrink-0">
                <h2 className="text-lg font-semibold tracking-wide">File Explorer</h2>
                 <div className="flex items-center gap-2 mt-2">
                    <button className="p-1.5 rounded hover:bg-gray-700" title="New File"><PlusIcon className="w-5 h-5" /></button>
                    <button className="p-1.5 rounded hover:bg-gray-700" title="New Folder"><FolderIcon className="w-5 h-5" /></button>
                    <button className="p-1.5 rounded hover:bg-gray-700" title="Refresh"><RefreshIcon className="w-5 h-5" /></button>
                </div>
            </header>
            <div className="flex-grow p-2 overflow-y-auto">
                 {Object.entries(fileTree.children!).map(([name, node]) => (
                    <TreeNode key={name} name={name} node={node} level={0} />
                ))}
            </div>
        </div>
    );
};