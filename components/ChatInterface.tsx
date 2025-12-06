
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { Bot, Loader2, X, Paperclip, Send, FileText } from 'lucide-react';
import { ChatMessage, AppSettings, Note } from '../types';
import { MermaidBlock } from './MermaidBlock';

interface ChatInterfaceProps {
  settings: AppSettings;
  notes: Note[];
  chatMessages: ChatMessage[];
  chatInput: string;
  setChatInput: (val: string) => void;
  chatImages: string[];
  setChatImages: (images: string[] | ((prev: string[]) => string[])) => void;
  generatingChat: boolean;
  handleChatSubmit: () => void;
  handleChatImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  chatScrollRef: React.RefObject<HTMLDivElement>;
  chatImageInputRef: React.RefObject<HTMLInputElement>;
  setAppMode: (mode: 'notes' | 'reader' | 'chat') => void;
  setActiveNoteId: (id: string) => void;
  setViewMode: (mode: 'card' | 'table' | 'tree' | 'graph') => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  settings, notes, chatMessages, chatInput, setChatInput, chatImages, setChatImages,
  generatingChat, handleChatSubmit, handleChatImageUpload, chatScrollRef, chatImageInputRef,
  setAppMode, setActiveNoteId, setViewMode
}) => {
  return (
    <div className="flex-1 flex flex-col h-screen bg-gray-50 dark:bg-dark-bg">
       {/* Header */}
       <div className="h-16 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-6 bg-white dark:bg-dark-card shrink-0">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-brand-600 rounded-full flex items-center justify-center text-white">
                <Bot size={24} />
             </div>
             <div>
                <h2 className="font-bold text-slate-800 dark:text-white">AI 知识助手</h2>
                <p className="text-xs text-gray-500">
                   {settings.aiConfig.modelName} • 基于 {notes.length} 条笔记
                </p>
             </div>
          </div>
       </div>

       {/* Chat Area */}
       <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-6 space-y-6">
          {chatMessages.map(msg => (
             <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-gray-500 text-white' : 'bg-brand-600 text-white'}`}>
                   {msg.role === 'user' ? 'Me' : <Bot size={16} />}
                </div>
                
                <div className={`max-w-[80%] space-y-2`}>
                   <div className={`p-4 rounded-xl shadow-sm ${msg.role === 'user' ? 'bg-brand-600 text-white' : 'bg-white dark:bg-dark-card text-slate-800 dark:text-slate-200 border border-gray-100 dark:border-gray-800'}`}>
                      {msg.images && msg.images.length > 0 && (
                        <div className="flex gap-2 mb-3 flex-wrap">
                          {msg.images.map((img, i) => (
                            <img key={i} src={img} alt="User upload" className="h-32 w-auto rounded-lg object-cover border border-white/20" />
                          ))}
                        </div>
                      )}
                      
                      <div className={`prose prose-sm max-w-none ${msg.role === 'user' ? 'prose-invert' : 'dark:prose-invert'}`}>
                         <ReactMarkdown 
                           remarkPlugins={[remarkGfm, remarkBreaks]}
                           components={{
                              code(props) {
                                  const {children, className, node, ...rest} = props;
                                  const match = /language-(\w+)/.exec(className || '');
                                  if (match && match[1] === 'mermaid') {
                                    return <MermaidBlock chart={String(children).replace(/\n$/, '')} />;
                                  }
                                  return <code {...rest} className={className}>{children}</code>;
                              }
                           }}
                         >{msg.content}</ReactMarkdown>
                      </div>
                   </div>

                   {/* Sources Citation */}
                   {msg.sources && msg.sources.length > 0 && (
                     <div className="flex gap-2 flex-wrap">
                        {msg.sources.map(note => (
                          <div 
                            key={note.id}
                            onClick={() => {
                               setAppMode('notes');
                               setActiveNoteId(note.id);
                               setViewMode('card');
                            }}
                            className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-lg text-xs cursor-pointer hover:border-brand-500 transition-colors shadow-sm"
                          >
                             <FileText size={12} className="text-brand-500" />
                             <span className="max-w-[150px] truncate font-medium dark:text-gray-300">{note.title}</span>
                          </div>
                        ))}
                     </div>
                   )}
                </div>
             </div>
          ))}
          {generatingChat && (
             <div className="flex gap-4">
                <div className="w-8 h-8 bg-brand-600 rounded-full flex items-center justify-center text-white shrink-0">
                   <Bot size={16} />
                </div>
                <div className="bg-white dark:bg-dark-card p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-2">
                   <Loader2 size={16} className="animate-spin text-brand-600" />
                   <span className="text-sm text-gray-500">正在检索笔记并思考...</span>
                </div>
             </div>
          )}
       </div>

       {/* Input Area */}
       <div className="p-4 bg-white dark:bg-dark-card border-t border-gray-200 dark:border-gray-800">
          {/* Image Preview */}
          {chatImages.length > 0 && (
            <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
               {chatImages.map((img, i) => (
                  <div key={i} className="relative group">
                    <img src={img} className="h-16 w-16 object-cover rounded-lg border border-gray-200 dark:border-gray-700" alt="preview" />
                    <button 
                      onClick={() => setChatImages(prev => prev.filter((_, idx) => idx !== i))}
                      className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={10} />
                    </button>
                  </div>
               ))}
            </div>
          )}
          
          <div className="flex items-end gap-2 bg-gray-100 dark:bg-slate-800 rounded-xl p-2 border border-transparent focus-within:border-brand-500 focus-within:bg-white dark:focus-within:bg-slate-900 transition-all shadow-inner">
             <button 
               onClick={() => chatImageInputRef.current?.click()}
               className="p-2 text-gray-400 hover:text-brand-600 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
             >
                <Paperclip size={20} />
             </button>
             <input type="file" ref={chatImageInputRef} className="hidden" accept="image/*" onChange={handleChatImageUpload} multiple />
             
             <textarea 
               value={chatInput}
               onChange={(e) => setChatInput(e.target.value)}
               onKeyDown={(e) => {
                 if (e.key === 'Enter' && !e.shiftKey) {
                   e.preventDefault();
                   handleChatSubmit();
                 }
               }}
               placeholder="问点什么... (支持 Shift+Enter 换行)"
               className="flex-1 bg-transparent border-none focus:outline-none resize-none max-h-32 min-h-[40px] py-2 text-sm text-slate-800 dark:text-slate-200"
               rows={1}
               disabled={generatingChat}
             />
             
             <button 
               onClick={handleChatSubmit}
               disabled={(!chatInput.trim() && chatImages.length === 0) || generatingChat}
               className="p-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:hover:bg-brand-600 transition-colors shadow-sm"
             >
                {generatingChat ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
             </button>
          </div>
       </div>
    </div>
  );
};
