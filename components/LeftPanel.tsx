
import React from 'react';
import { 
  Book, Rss, Bot, Share2, Sun, Moon, Plus, FileUp, Link as LinkIcon, 
  Loader2, LayoutGrid, List, FolderTree, Search, Trash2, Folder, FileText, Newspaper, Settings
} from 'lucide-react';
import { Note, RSSFeed } from '../types';

interface LeftPanelProps {
  appMode: 'notes' | 'reader' | 'chat';
  setAppMode: (mode: 'notes' | 'reader' | 'chat') => void;
  isDarkMode: boolean;
  handleThemeToggle: () => void;
  setSettingsOpen: (open: boolean) => void;
  
  // Notes Props
  notes: Note[];
  filteredNotes: Note[];
  activeNoteId: string | null;
  setActiveNoteId: (id: string | null) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  viewMode: 'card' | 'table' | 'tree' | 'graph';
  setViewMode: (mode: 'card' | 'table' | 'tree' | 'graph') => void;
  handleCreateNote: () => void;
  importFileRef: React.RefObject<HTMLInputElement>;
  handleImportFileNote: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleImportUrlNote: () => void;
  importing: boolean;

  // RSS Props
  rssFeeds: RSSFeed[];
  activeFeedUrl: string | null;
  setActiveFeedUrl: (url: string | null) => void;
  handleAddRSS: () => void;
  handleDeleteRSS: (e: React.MouseEvent, url: string) => void;
}

export const LeftPanel: React.FC<LeftPanelProps> = ({
  appMode, setAppMode, isDarkMode, handleThemeToggle, setSettingsOpen,
  notes, filteredNotes, activeNoteId, setActiveNoteId, searchQuery, setSearchQuery, viewMode, setViewMode,
  handleCreateNote, importFileRef, handleImportFileNote, handleImportUrlNote, importing,
  rssFeeds, activeFeedUrl, setActiveFeedUrl, handleAddRSS, handleDeleteRSS
}) => {

  const renderTreeView = () => {
    const treeStructure: Record<string, Note[]> = {};
    const rootNotes: Note[] = [];

    filteredNotes.forEach(note => {
      const parts = note.folder ? note.folder.split('/') : [];
      if (parts.length > 0) {
        const rootFolder = parts[0]; 
        if (!treeStructure[rootFolder]) treeStructure[rootFolder] = [];
        treeStructure[rootFolder].push(note);
      } else {
        rootNotes.push(note);
      }
    });

    return (
      <div className="space-y-1 pl-2">
         {Object.keys(treeStructure).sort().map(folder => (
            <div key={folder}>
              <div className="flex items-center gap-2 p-1 text-xs font-bold text-gray-500 uppercase tracking-wider mt-2">
                 <Folder size={12} /> {folder}
              </div>
              <div className="pl-3 border-l-2 border-gray-100 dark:border-slate-800 ml-1.5 space-y-1">
                {treeStructure[folder].map(note => (
                  <div 
                    key={note.id}
                    onClick={() => setActiveNoteId(note.id)}
                    className={`flex items-center gap-2 p-2 rounded text-sm cursor-pointer ${activeNoteId === note.id ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300' : 'text-slate-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
                  >
                    <FileText size={14} /> <span className="truncate">{note.title}</span>
                  </div>
                ))}
              </div>
            </div>
         ))}
         {rootNotes.length > 0 && (
           <div className="mt-2">
              <div className="flex items-center gap-2 p-1 text-xs font-bold text-gray-500 uppercase tracking-wider">
                 <Folder size={12} /> 未分类
              </div>
              <div className="pl-3 border-l-2 border-gray-100 dark:border-slate-800 ml-1.5 space-y-1">
                {rootNotes.map(note => (
                  <div 
                    key={note.id}
                    onClick={() => setActiveNoteId(note.id)}
                    className={`flex items-center gap-2 p-2 rounded text-sm cursor-pointer ${activeNoteId === note.id ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300' : 'text-slate-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
                  >
                    <FileText size={14} /> <span className="truncate">{note.title}</span>
                  </div>
                ))}
              </div>
           </div>
         )}
      </div>
    );
  };

  const renderNotesSidebarContent = () => (
    <>
      <div className="p-3 grid grid-cols-4 gap-1">
        <button 
          onClick={handleCreateNote}
          className="col-span-2 bg-brand-600 hover:bg-brand-700 text-white p-2 rounded-md flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95 text-sm font-medium"
        >
          <Plus size={16} /> 新建
        </button>
        <button 
          onClick={() => importFileRef.current?.click()}
          className="bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 p-2 rounded-md flex items-center justify-center transition-all shadow-sm active:scale-95"
          title="导入文件 (.md, .txt)"
        >
          <FileUp size={16} />
        </button>
        <input type="file" ref={importFileRef} className="hidden" accept=".md,.txt,.js,.json,.ts" onChange={handleImportFileNote} />
        <button 
          onClick={handleImportUrlNote}
          className="bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 p-2 rounded-md flex items-center justify-center transition-all shadow-sm active:scale-95 relative"
          title="从 URL 解析导入"
          disabled={importing}
        >
          {importing ? <Loader2 size={16} className="animate-spin text-brand-500" /> : <LinkIcon size={16} />}
        </button>
      </div>

      <div className="px-4 pb-2">
         <div className="flex bg-gray-100 dark:bg-slate-800 rounded p-1 mb-2">
           <button onClick={() => setViewMode('card')} className={`flex-1 p-1 rounded text-center ${viewMode === 'card' ? 'bg-white dark:bg-slate-600 shadow-sm' : 'text-gray-500'}`} title="卡片视图"><LayoutGrid size={16} className="mx-auto"/></button>
           <button onClick={() => setViewMode('table')} className={`flex-1 p-1 rounded text-center ${viewMode === 'table' ? 'bg-white dark:bg-slate-600 shadow-sm' : 'text-gray-500'}`} title="列表视图"><List size={16} className="mx-auto"/></button>
           <button onClick={() => setViewMode('tree')} className={`flex-1 p-1 rounded text-center ${viewMode === 'tree' ? 'bg-white dark:bg-slate-600 shadow-sm' : 'text-gray-500'}`} title="树状视图"><FolderTree size={16} className="mx-auto"/></button>
         </div>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 text-gray-400" size={16} />
          <input 
            type="text" 
            placeholder="搜索笔记..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-100 dark:bg-slate-800 pl-8 pr-2 py-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:text-gray-200"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 space-y-1 custom-scrollbar">
        {viewMode === 'tree' ? renderTreeView() : (
          filteredNotes.length === 0 ? (
            <div className="text-center text-gray-400 mt-10 text-sm">
               {importing ? "正在解析链接..." : "未找到笔记"}
            </div>
          ) : (
            filteredNotes.map(note => (
              <div 
                key={note.id}
                onClick={() => setActiveNoteId(note.id)}
                className={`relative p-3 rounded cursor-pointer group transition-all duration-200 border-l-4 ${activeNoteId === note.id ? 'bg-brand-50 dark:bg-brand-900/30 border-brand-500 shadow-sm' : 'hover:bg-gray-50 dark:hover:bg-slate-800 border-transparent'}`}
              >
                <div className="flex justify-between items-start">
                   <h3 className="font-medium text-slate-700 dark:text-slate-200 truncate w-full">{note.title}</h3>
                </div>
                {viewMode === 'card' && (
                  <>
                    <p className="text-xs text-gray-500 mt-1 truncate">{note.content.substring(0, 60) || "空白笔记..."}</p>
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {note.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="text-[10px] bg-gray-200 dark:bg-slate-700 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-300">#{tag}</span>
                      ))}
                    </div>
                  </>
                )}
                {viewMode === 'table' && (
                  <div className="text-[10px] text-gray-400 mt-1 flex justify-between">
                    <span>{new Date(note.updatedAt).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            ))
          )
        )}
        
        <div className="pt-2 px-2">
           <button 
             onClick={() => { setActiveNoteId(null); setViewMode('graph'); }}
             className={`flex items-center gap-2 w-full p-2 rounded text-sm transition-colors ${viewMode === 'graph' ? 'bg-gray-100 dark:bg-slate-800 font-bold text-brand-600' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
           >
             <Share2 size={16} /> 知识图谱
           </button>
        </div>
      </div>
    </>
  );

  const renderRSSSidebarContent = () => (
    <>
      <div className="p-3">
        <button 
          onClick={handleAddRSS}
          className="w-full bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 p-2 rounded-md flex items-center justify-center gap-2 transition-all text-sm font-medium"
        >
          <Plus size={16} /> 添加订阅源
        </button>
      </div>

      <div className="px-4 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">订阅列表</div>
      
      <div className="flex-1 overflow-y-auto px-2 space-y-1 custom-scrollbar">
         {rssFeeds.map(feed => (
           <div 
             key={feed.url}
             onClick={() => setActiveFeedUrl(feed.url)}
             className={`relative p-2 rounded cursor-pointer group flex items-center justify-between ${activeFeedUrl === feed.url ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300' : 'text-slate-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
           >
              <div className="flex items-center gap-2 truncate">
                 <Newspaper size={14} />
                 <span className="text-sm truncate">{feed.title}</span>
              </div>
              <button 
                onClick={(e) => handleDeleteRSS(e, feed.url)} 
                className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-opacity"
              >
                <Trash2 size={12} />
              </button>
           </div>
         ))}
      </div>
    </>
  );

  return (
    <div className="w-64 bg-white dark:bg-dark-card border-r border-gray-200 dark:border-gray-800 flex flex-col h-screen transition-colors duration-200 shrink-0 z-20">
      <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2 text-brand-600 font-bold text-xl">
          <Share2 size={24} />
          <span>CogniSphere</span>
        </div>
        <button onClick={handleThemeToggle} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
          {isDarkMode ? <Sun size={18} className="text-yellow-400"/> : <Moon size={18} className="text-slate-600"/>}
        </button>
      </div>

      <div className="flex border-b border-gray-200 dark:border-gray-800">
        <button 
          onClick={() => setAppMode('notes')}
          className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${appMode === 'notes' ? 'text-brand-600 border-b-2 border-brand-600 bg-brand-50/50 dark:bg-brand-900/10' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
          title="知识库"
        >
          <Book size={16} />
        </button>
        <button 
          onClick={() => setAppMode('reader')}
          className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${appMode === 'reader' ? 'text-brand-600 border-b-2 border-brand-600 bg-brand-50/50 dark:bg-brand-900/10' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
          title="阅读室"
        >
          <Rss size={16} />
        </button>
        <button 
          onClick={() => setAppMode('chat')}
          className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${appMode === 'chat' ? 'text-brand-600 border-b-2 border-brand-600 bg-brand-50/50 dark:bg-brand-900/10' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
          title="AI 助手"
        >
          <Bot size={16} />
        </button>
      </div>
      
      {appMode === 'notes' && renderNotesSidebarContent()}
      {appMode === 'reader' && renderRSSSidebarContent()}
      {appMode === 'chat' && (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-4 text-center">
           <Bot size={48} className="mb-4 opacity-20"/>
           <p className="text-sm">在这里与您的个人知识库对话。我会引用您的笔记来回答问题。</p>
        </div>
      )}

      <div className="p-4 border-t border-gray-200 dark:border-gray-800 space-y-1">
        <button 
          onClick={() => setSettingsOpen(true)}
          className="flex items-center gap-2 w-full p-2 rounded text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800"
        >
          <Settings size={16} /> 系统设置
        </button>
      </div>
    </div>
  );
};
