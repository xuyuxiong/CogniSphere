
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { History, RotateCcw } from 'lucide-react';
import { Note, NoteVersion } from '../types';

interface HistoryModalProps {
  historyModalOpen: boolean;
  setHistoryModalOpen: (open: boolean) => void;
  activeNote: Note | undefined;
  handleRestoreVersion: (version: NoteVersion) => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  historyModalOpen, setHistoryModalOpen, activeNote, handleRestoreVersion
}) => {
  if (!historyModalOpen || !activeNote) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
       <div className="bg-white dark:bg-slate-900 w-full max-w-4xl h-[80vh] rounded-xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700 flex flex-col">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
            <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">
              <History size={20} className="text-brand-600" /> 版本历史: {activeNote.title}
            </h3>
            <button onClick={() => setHistoryModalOpen(false)} className="text-gray-400 hover:text-gray-700">✕</button>
          </div>
          
          <div className="flex-1 flex overflow-hidden">
             <div className="w-64 border-r border-gray-200 dark:border-gray-800 overflow-y-auto bg-gray-50 dark:bg-slate-900/50">
                <div className="p-3 text-xs font-bold text-gray-500 uppercase">历史快照 ({activeNote.versions.length})</div>
                {activeNote.versions.length === 0 && <div className="p-4 text-sm text-gray-400 text-center">暂无历史版本</div>}
                {activeNote.versions.map((v, i) => (
                  <div key={v.timestamp} className="p-3 border-b border-gray-100 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800 cursor-default group">
                     <div className="flex justify-between items-start">
                       <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{new Date(v.timestamp).toLocaleString()}</span>
                     </div>
                     <div className="text-xs text-gray-400 mt-1 truncate">字数: {v.content.length}</div>
                     <button 
                       onClick={() => handleRestoreVersion(v)}
                       className="mt-2 w-full flex items-center justify-center gap-1 text-xs bg-brand-50 hover:bg-brand-100 text-brand-700 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                     >
                       <RotateCcw size={12} /> 恢复此版本
                     </button>
                  </div>
                ))}
             </div>
             
             <div className="flex-1 p-6 overflow-y-auto bg-white dark:bg-dark-bg">
                <div className="prose dark:prose-invert max-w-none">
                   <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 text-sm rounded border border-yellow-200 dark:border-yellow-900/50">
                      提示: 点击左侧列表中的“恢复此版本”按钮可回滚到该状态。
                   </div>
                   <h2 className="text-gray-400 border-b pb-2 mb-4">当前最新内容</h2>
                   <ReactMarkdown remarkPlugins={[remarkGfm]}>{activeNote.content}</ReactMarkdown>
                </div>
             </div>
          </div>
       </div>
    </div>
  );
};
