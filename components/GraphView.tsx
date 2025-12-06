
import React from 'react';
import { Share2 } from 'lucide-react';
import { Note } from '../types';
import { KnowledgeGraph } from './KnowledgeGraph';

interface GraphViewProps {
  notes: Note[];
  setActiveNoteId: (id: string) => void;
  setViewMode: (mode: 'card') => void;
  setAppMode: (mode: 'notes') => void;
}

export const GraphView: React.FC<GraphViewProps> = ({ notes, setActiveNoteId, setViewMode, setAppMode }) => {
  return (
     <div className="flex-1 flex flex-col h-screen bg-gray-50 dark:bg-dark-bg">
        <div className="p-6 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-dark-card flex justify-between items-center shadow-sm z-10">
           <div>
             <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
               <Share2 className="text-brand-500" /> 知识图谱
             </h2>
             <p className="text-sm text-gray-500 mt-1">可视化展示 {notes.length} 条笔记之间的关联。</p>
           </div>
           <button 
             onClick={() => { setViewMode('card'); }}
             className="px-4 py-2 bg-white border border-gray-300 dark:bg-slate-700 dark:border-slate-600 rounded-lg shadow-sm text-sm hover:bg-gray-50 dark:text-white transition-all"
           >
             返回列表
           </button>
        </div>
        <div className="flex-1 overflow-hidden relative">
           <KnowledgeGraph 
             notes={notes} 
             onNodeClick={(id) => {
               setActiveNoteId(id);
               setViewMode('card');
               setAppMode('notes');
             }} 
            />
        </div>
     </div>
  );
};
