
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { 
  Book, ImageIcon, History, Wand2, Trash2, Folder, Tag as TagIcon, FileUp, Link as LinkIcon, Copy as CopyIcon
} from 'lucide-react';
import { Note, AppSettings, PromptTemplate } from '../types';
import { EditorToolbar } from './EditorToolbar';
import { CodeEditor } from './CodeEditor';
import { MermaidBlock } from './MermaidBlock';

interface NoteEditorProps {
  activeNote: Note | undefined;
  loadingAI: boolean;
  settings: AppSettings;
  templates: PromptTemplate[];
  handleUpdateNote: (id: string, updates: Partial<Note>, saveVersion?: boolean) => void;
  handleEditorInsert: (textToInsert: string, cursorOffset?: number) => void;
  handleEditorScroll: (e: React.UIEvent<HTMLTextAreaElement>) => void;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleAIAction: (template: PromptTemplate) => void;
  handleDeleteNote: (e: React.MouseEvent, id: string) => void;
  setHistoryModalOpen: (open: boolean) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  editorRef: React.RefObject<HTMLTextAreaElement>;
  previewScrollRef: React.RefObject<HTMLDivElement>;
  handleImportUrlNote: () => void;
  importFileRef: React.RefObject<HTMLInputElement>;
}

export const NoteEditor: React.FC<NoteEditorProps> = ({
  activeNote, loadingAI, templates, 
  handleUpdateNote, handleEditorInsert, handleEditorScroll, handleImageUpload, 
  handleAIAction, handleDeleteNote, setHistoryModalOpen, 
  fileInputRef, editorRef, previewScrollRef, handleImportUrlNote, importFileRef
}) => {
  if (!activeNote) return (
    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50 dark:bg-dark-bg">
      <Book size={64} className="mb-4 opacity-20" />
      <p className="text-lg font-medium">CogniSphere 知识库</p>
      <p className="text-sm mt-2">选择左侧笔记或点击“新建”开始工作</p>
      <div className="flex gap-4 mt-8">
         <button onClick={() => importFileRef.current?.click()} className="flex flex-col items-center gap-2 p-4 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
            <FileUp size={24} />
            <span className="text-xs">导入文件</span>
         </button>
         <button onClick={handleImportUrlNote} className="flex flex-col items-center gap-2 p-4 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
            <LinkIcon size={24} />
            <span className="text-xs">导入 URL</span>
         </button>
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-white dark:bg-dark-bg transition-colors duration-200">
      {/* Toolbar */}
      <div className="h-16 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-6 bg-white dark:bg-dark-bg shrink-0">
        <div className="flex flex-col w-1/2">
          <input 
            value={activeNote.title}
            onChange={(e) => handleUpdateNote(activeNote.id, { title: e.target.value })}
            className="text-xl font-bold bg-transparent border-none focus:outline-none text-slate-800 dark:text-slate-100 placeholder-gray-300 dark:placeholder-gray-700"
            placeholder="笔记标题..."
          />
        </div>
        
        <div className="flex items-center gap-3">
           {loadingAI && (
             <div className="flex items-center gap-2 px-3 py-1 bg-brand-50 dark:bg-brand-900/20 rounded-full">
               <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce"></div>
               <span className="text-xs text-brand-600 dark:text-brand-400 font-medium">AI 思考中</span>
             </div>
           )}
           
           <button 
             onClick={() => fileInputRef.current?.click()}
             className="p-2 text-slate-500 hover:text-brand-600 hover:bg-gray-100 dark:hover:bg-slate-800 rounded transition-colors"
             title="插入图片/附件"
           >
             <ImageIcon size={18} />
           </button>
           <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />

           <button 
             onClick={() => setHistoryModalOpen(true)}
             className="p-2 text-slate-500 hover:text-brand-600 hover:bg-gray-100 dark:hover:bg-slate-800 rounded transition-colors"
             title="版本历史"
           >
             <History size={18} />
           </button>

           <div className="relative group z-10">
              <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 hover:bg-brand-50 dark:hover:bg-slate-700 hover:text-brand-600 rounded-md transition-all border border-transparent hover:border-brand-200">
                <Wand2 size={16} /> AI 工具
              </button>
              <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-slate-800 shadow-xl rounded-lg border border-gray-200 dark:border-gray-700 hidden group-hover:block overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-4 py-1.5 text-[10px] text-gray-400 font-bold uppercase tracking-wider bg-gray-50 dark:bg-slate-700/50">提示词模板</div>
                {templates.map(t => (
                  <button 
                    key={t.id}
                    onClick={() => handleAIAction(t)}
                    className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-b border-gray-100 dark:border-slate-700/50 last:border-0"
                  >
                    {t.name}
                    <span className="block text-[10px] text-gray-400 truncate">{t.description}</span>
                  </button>
                ))}
              </div>
           </div>

           <button 
              onClick={(e) => handleDeleteNote(e, activeNote.id)}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors" 
              title="删除笔记"
            >
             <Trash2 size={18} />
           </button>
        </div>
      </div>

      {/* Meta Bar */}
      <div className="px-6 py-2 bg-gray-50/50 dark:bg-dark-card/30 flex items-center gap-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
         <div className="flex items-center gap-2 flex-1 max-w-xs relative group">
           <Folder size={14} className="text-gray-400" />
           <input 
             className="bg-transparent text-sm focus:outline-none text-slate-600 dark:text-slate-400 w-full placeholder-gray-400 border-b border-transparent focus:border-brand-300"
             placeholder="文件夹 (例: Work/Project)..."
             value={activeNote.folder}
             onChange={(e) => handleUpdateNote(activeNote.id, { folder: e.target.value })}
           />
         </div>
         <div className="h-4 w-[1px] bg-gray-300 dark:bg-gray-700"></div>
         <div className="flex items-center gap-2 flex-1">
           <TagIcon size={14} className="text-gray-400" />
           <input 
             className="bg-transparent text-sm focus:outline-none text-slate-600 dark:text-slate-400 w-full placeholder-gray-400"
             placeholder="标签 (用逗号分隔)..."
             value={activeNote.tags.join(', ')}
             onChange={(e) => handleUpdateNote(activeNote.id, { tags: e.target.value.split(/[,，]/).map(t => t.trim()).filter(Boolean) })}
           />
         </div>
      </div>
      
      {/* Editor Toolbar */}
      <EditorToolbar onInsert={handleEditorInsert} />

      {/* Content Area - Split View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor Input - Uses new CodeEditor */}
        <div className="flex-1 h-full border-r border-gray-200 dark:border-gray-800 relative">
           <CodeEditor 
              ref={editorRef}
              value={activeNote.content}
              onChange={(val) => handleUpdateNote(activeNote.id, { content: val })}
              onScroll={handleEditorScroll}
              onSave={() => alert('已保存')}
              placeholder="# 开始你的创作...\n支持 Markdown, Mermaid 图表, 表格等"
              onPaste={(e) => {
                const items = e.clipboardData.items;
                for (let i = 0; i < items.length; i++) {
                  if (items[i].type.indexOf('image') !== -1) {
                    const blob = items[i].getAsFile();
                    if (blob) {
                       const reader = new FileReader();
                       reader.onload = (event) => {
                         const base64 = event.target?.result as string;
                         handleEditorInsert(`\n![Pasted Image](${base64})\n`);
                       };
                       reader.readAsDataURL(blob);
                    }
                  }
                }
             }}
           />
        </div>
        
        {/* Preview Panel */}
        <div 
          ref={previewScrollRef}
          className="flex-1 p-8 overflow-y-auto prose dark:prose-invert prose-sm max-w-none bg-gray-50 dark:bg-slate-900/50 markdown-body"
        >
           {activeNote.content ? (
             <ReactMarkdown 
               remarkPlugins={[remarkGfm, remarkBreaks]}
               components={{
                  code(props) {
                      const {children, className, node, ...rest} = props;
                      const match = /language-(\w+)/.exec(className || '');
                      const lang = match ? match[1] : '';
                      
                      if (lang === 'mermaid') {
                         return <MermaidBlock chart={String(children).replace(/\n$/, '')} />;
                      }

                      // Inline code
                      if (!match && !String(children).includes('\n')) {
                         return <code {...rest} className={className}>{children}</code>;
                      }

                      // Block code with Mac-style window
                      return (
                        <div className="code-block-wrapper">
                           <div className="code-block-header">
                              <div className="code-dots">
                                 <div className="code-dot red"></div>
                                 <div className="code-dot yellow"></div>
                                 <div className="code-dot green"></div>
                              </div>
                              <span className="text-xs text-gray-500 font-mono">{lang || 'text'}</span>
                              <button 
                                 onClick={() => navigator.clipboard.writeText(String(children))}
                                 className="text-gray-400 hover:text-brand-500 transition-colors"
                                 title="复制"
                              >
                                 <CopyIcon size={14} />
                              </button>
                           </div>
                           <div className="p-4 overflow-x-auto bg-[#1e293b] text-slate-200 text-sm font-mono">
                              <code {...rest} className={`${className || ''} bg-transparent p-0`}>{children}</code>
                           </div>
                        </div>
                      );
                  }
               }}
             >
               {activeNote.content}
             </ReactMarkdown>
           ) : (
             <div className="text-gray-400 italic">预览区域</div>
           )}
        </div>
      </div>
      
      <div className="h-8 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between px-6 text-xs text-gray-400 bg-white dark:bg-dark-card select-none shrink-0">
         <span>字数: {activeNote.content.length}</span>
         <span className="flex items-center gap-3">
           <span className={`flex items-center gap-1 ${activeNote.embedding ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
             <div className={`w-1.5 h-1.5 rounded-full ${activeNote.embedding ? 'bg-green-500' : 'bg-gray-300'}`} />
             {activeNote.embedding ? '向量已索引' : '未索引'}
           </span>
           <span>更新于: {new Date(activeNote.updatedAt).toLocaleTimeString()}</span>
         </span>
      </div>
    </div>
  );
};
