import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Book, 
  Search, 
  Settings, 
  Plus, 
  Save, 
  Trash2, 
  Share2, 
  BrainCircuit, 
  Moon, 
  Sun,
  Wand2,
  Tag as TagIcon,
  Check,
  ChevronDown,
  LayoutGrid,
  List,
  FolderTree,
  Image as ImageIcon,
  History,
  RotateCcw,
  Download,
  Upload,
  Folder,
  FileText,
  FileUp,
  Link as LinkIcon,
  Loader2,
  Code,
  Sparkles,
  Server,
  PenTool,
  GraduationCap,
  Briefcase,
  X
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { StorageService } from './services/storageService';
import { AIService } from './services/geminiService';
import { KnowledgeGraph } from './components/KnowledgeGraph';
import { Note, AppSettings, NoteType, AIProvider, PromptTemplate, AIModelConfig, NoteVersion } from './types';

// Simple UUID generator
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

const PROVIDERS: { id: AIProvider; name: string; defaultBaseUrl?: string; defaultModel: string }[] = [
  { id: 'google', name: 'Google Gemini', defaultModel: 'gemini-2.5-flash' },
  { id: 'deepseek', name: 'DeepSeek', defaultBaseUrl: 'https://api.deepseek.com', defaultModel: 'deepseek-chat' },
  { id: 'siliconflow', name: 'SiliconFlow (iFlow)', defaultBaseUrl: 'https://api.siliconflow.cn/v1', defaultModel: 'Qwen/Qwen2.5-7B-Instruct' },
  { id: 'custom', name: 'Custom (OpenAI Compatible)', defaultModel: 'gpt-3.5-turbo' }
];

const App: React.FC = () => {
  // --- State ---
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'card' | 'table' | 'tree' | 'graph'>('card');
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  const [settings, setSettings] = useState<AppSettings>({
    aiConfig: {
      provider: 'google',
      apiKey: '',
      modelName: 'gemini-2.5-flash'
    },
    theme: 'light',
    useSemanticSearch: false,
    userName: 'Engineer',
    hasCompletedOnboarding: false
  });
  
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'general' | 'prompts' | 'data'>('general');
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiMenuOpen, setAiMenuOpen] = useState(false); // Changed from hover to click
  const [importing, setImporting] = useState(false);
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importFileRef = useRef<HTMLInputElement>(null);
  const aiMenuRef = useRef<HTMLDivElement>(null);

  // Derived State
  const activeNote = useMemo(() => notes.find(n => n.id === activeNoteId), [notes, activeNoteId]);
  
  const filteredNotes = useMemo(() => {
    if (!searchQuery) return notes.sort((a,b) => b.updatedAt - a.updatedAt);
    return notes.filter(n => 
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      n.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
      n.folder?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [notes, searchQuery]);

  // --- Effects ---
  useEffect(() => {
    // Initial Load
    const loadData = async () => {
      const storedNotes = await StorageService.getNotes();
      const migratedNotes = storedNotes.map(n => ({ ...n, folder: n.folder || '' }));
      setNotes(migratedNotes);
      
      const storedSettings = await StorageService.getSettings();
      if (storedSettings) {
        if ((storedSettings as any).apiKey && !storedSettings.aiConfig) {
          storedSettings.aiConfig = {
            provider: 'google',
            apiKey: (storedSettings as any).apiKey,
            modelName: 'gemini-2.5-flash'
          };
        }
        setSettings({ ...storedSettings, hasCompletedOnboarding: !!storedSettings.hasCompletedOnboarding });
        
        // Show onboarding if not completed
        if (!storedSettings.hasCompletedOnboarding) {
          setOnboardingOpen(true);
        }

        if (storedSettings.theme === 'dark') {
          document.documentElement.classList.add('dark');
          setIsDarkMode(true);
        }
      } else {
        // First time user ever
        setOnboardingOpen(true);
      }

      const storedTemplates = await StorageService.getTemplates();
      setTemplates(storedTemplates);
    };
    loadData();
  }, []);

  // Close AI menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (aiMenuRef.current && !aiMenuRef.current.contains(event.target as Node)) {
        setAiMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- Handlers ---
  const handleThemeToggle = () => {
    const newTheme = isDarkMode ? 'light' : 'dark';
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
    const newSettings = { ...settings, theme: newTheme as 'light' | 'dark' };
    setSettings(newSettings);
    StorageService.saveSettings(newSettings);
  };

  const createNewNote = async (initialData: Partial<Note> = {}) => {
    const newNote: Note = {
      id: generateId(),
      title: initialData.title || '无标题笔记',
      content: initialData.content || '',
      folder: initialData.folder || '',
      type: initialData.type || NoteType.MARKDOWN,
      tags: initialData.tags || [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      versions: [],
      ...initialData
    };
    await StorageService.saveNote(newNote);
    setNotes(prev => [newNote, ...prev]);
    setActiveNoteId(newNote.id);
    if (viewMode === 'graph') setViewMode('card');
  };

  const handleCreateNote = () => createNewNote();

  const handleImportFileNote = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      const fileName = file.name.replace(/\.[^/.]+$/, "");
      
      await createNewNote({
        title: fileName,
        content: content,
        type: file.name.endsWith('.md') ? NoteType.MARKDOWN : NoteType.CODE
      });
      if (importFileRef.current) importFileRef.current.value = '';
    };

    if (file.type.startsWith('text') || file.name.endsWith('.md') || file.name.endsWith('.js') || file.name.endsWith('.ts') || file.name.endsWith('.json')) {
       reader.readAsText(file);
    } else {
       alert("目前主要支持导入文本文件（.md, .txt, 代码文件等）。");
    }
  };

  const handleImportUrlNote = async () => {
    const url = prompt("请输入文章链接 (例如 掘金、语雀、Medium)：");
    if (!url) return;

    setImporting(true);
    try {
      const response = await fetch(`https://r.jina.ai/${url}`);
      if (!response.ok) throw new Error("无法抓取该页面");
      const text = await response.text();
      const titleMatch = text.match(/^Title:\s*(.+)$/m);
      const title = titleMatch ? titleMatch[1] : '导入的网页笔记';
      
      await createNewNote({
        title: title,
        content: text,
        tags: ['导入', 'WebClip'],
        folder: 'Inbox'
      });

    } catch (e: any) {
      alert(`导入失败: ${e.message}。`);
    } finally {
      setImporting(false);
    }
  };

  const handleUpdateNote = async (id: string, updates: Partial<Note>, saveVersion = false) => {
    setNotes(prev => prev.map(n => {
      if (n.id === id) {
        let updated = { ...n, ...updates, updatedAt: Date.now() };
        if (saveVersion || (updates.content && updates.content.length > n.content.length + 50)) {
           const newVersion: NoteVersion = {
             timestamp: Date.now(),
             content: n.content,
             summary: n.summary
           };
           updated.versions = [newVersion, ...n.versions].slice(0, 20);
        }
        StorageService.saveNote(updated);
        return updated;
      }
      return n;
    }));
  };

  const handleRestoreVersion = (version: NoteVersion) => {
    if (!activeNote) return;
    if (!window.confirm(`确定要回滚到 ${new Date(version.timestamp).toLocaleString()} 的版本吗？`)) return;
    handleUpdateNote(activeNote.id, { content: version.content }, true);
    setHistoryModalOpen(false);
  };

  const handleDeleteNote = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm("确定要删除这条笔记吗？")) return;
    await StorageService.deleteNote(id);
    setNotes(prev => prev.filter(n => n.id !== id));
    if (activeNoteId === id) setActiveNoteId(null);
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (settings.useSemanticSearch && settings.aiConfig.apiKey && query.length > 3) {
      setLoadingAI(true);
      try {
        const results = await AIService.semanticSearch(query, notes, settings.aiConfig);
        console.log("Semantic Results:", results);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingAI(false);
      }
    }
  };

  // --- AI & Features ---
  const handleAIAction = async (template: PromptTemplate) => {
    if (!activeNote || !settings.aiConfig.apiKey) {
      setSettingsOpen(true);
      return alert("请先在设置中配置 API Key 以使用 AI 功能");
    }
    
    setLoadingAI(true);
    setAiMenuOpen(false); // Close menu
    try {
      // Improve prompt with context
      let prompt = template.template.replace('{{content}}', activeNote.content);
      
      const result = await AIService.generateText(prompt, settings.aiConfig);
      
      if (template.name.includes("标签")) {
         const newTags = result.split(/[,，]/).map(t => t.trim()).filter(Boolean);
         const uniqueTags = Array.from(new Set([...activeNote.tags, ...newTags]));
         handleUpdateNote(activeNote.id, { tags: uniqueTags });
      } else {
        const newContent = activeNote.content + `\n\n> **AI 思考结果 (${template.name}):**\n\n` + result;
        handleUpdateNote(activeNote.id, { content: newContent }, true);
      }
    } catch (e: any) {
      alert("AI 错误: " + e.message);
    } finally {
      setLoadingAI(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeNote) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      const imageMarkdown = `\n![${file.name}](${base64})\n`;
      handleUpdateNote(activeNote.id, { content: activeNote.content + imageMarkdown }, true);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleExportData = () => {
    const data = { notes, settings, templates, exportDate: new Date().toISOString(), appVersion: '1.2.0' };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CogniSphere_Backup_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.notes && Array.isArray(data.notes)) {
           if (!window.confirm(`检测到备份包含 ${data.notes.length} 条笔记。是否继续？`)) return;
           for (const n of data.notes) await StorageService.saveNote(n);
           if (data.templates) for (const t of data.templates) await StorageService.saveTemplate(t);
           const newNotes = await StorageService.getNotes();
           setNotes(newNotes);
           alert("导入成功！");
        } else {
          alert("无效的备份文件");
        }
      } catch (err) { alert("导入失败: JSON 解析错误"); }
    };
    reader.readAsText(file);
  };

  // --- Onboarding Logic ---
  const handleOnboardingComplete = async (role: string, folders: string[]) => {
    // 1. Create Folders by creating sample notes in them
    const welcomeId = generateId();
    const welcomeNote: Note = {
      id: welcomeId,
      title: '👋 欢迎使用 CogniSphere',
      content: `# 欢迎来到你的个人知识库\n\n你选择了 **${role}** 身份，系统已为你自动构建了知识目录。\n\n## 快速开始\n- 点击左上角 **+ 新建** 创建笔记\n- 点击 **AI 工具** 体验智能辅助\n- 尝试导入你现有的 Markdown 文件\n\n## 快捷键\n- 搜索: Ctrl/Cmd + K (即将支持)\n- 保存: 自动保存`,
      folder: 'Inbox',
      type: NoteType.MARKDOWN,
      tags: ['系统', '欢迎'],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      versions: []
    };
    await StorageService.saveNote(welcomeNote);

    // Create a placeholder note for each folder to ensure it appears in the tree
    for (const folder of folders) {
      await createNewNote({
        title: `${folder} - 学习路径`,
        content: `这是 ${folder} 的知识分类。\n开始记录你的学习心得吧！`,
        folder: folder,
        tags: [role, folder]
      });
    }

    // 2. Update settings
    const newSettings = { ...settings, hasCompletedOnboarding: true, userName: role };
    setSettings(newSettings);
    await StorageService.saveSettings(newSettings);
    
    // 3. Refresh
    const newNotes = await StorageService.getNotes();
    setNotes(newNotes);
    setActiveNoteId(welcomeId);
    setOnboardingOpen(false);
  };

  // --- Sub-Renderers ---

  const renderOnboardingModal = () => {
    if (!onboardingOpen) return null;

    const identities = [
      { id: 'frontend', name: '前端工程师', icon: <Code size={32} />, folders: ['JavaScript', 'React', 'Vue', 'CSS', 'Performance', 'WebArchitecture'] },
      { id: 'backend', name: '后端工程师', icon: <Server size={32} />, folders: ['Node.js', 'Database', 'Microservices', 'Docker', 'SystemDesign'] },
      { id: 'product', name: '产品经理', icon: <Briefcase size={32} />, folders: ['UserResearch', 'Requirements', 'Roadmap', 'CompetitorAnalysis'] },
      { id: 'student', name: '学生/研究员', icon: <GraduationCap size={32} />, folders: ['Literature', 'Notes', 'Thesis', 'References'] },
      { id: 'writer', name: '创作者', icon: <PenTool size={32} />, folders: ['Ideas', 'Drafts', 'Published', 'Inspiration'] }
    ];

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/90 backdrop-blur-md animate-in fade-in duration-500">
         <div className="bg-white dark:bg-slate-800 w-full max-w-4xl p-8 rounded-2xl shadow-2xl border border-white/10 flex flex-col items-center">
            <div className="mb-8 text-center">
              <div className="flex items-center justify-center gap-3 mb-4">
                 <BrainCircuit size={48} className="text-brand-500" />
              </div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">欢迎来到 CogniSphere</h1>
              <p className="text-slate-500 dark:text-slate-400">请选择你的角色，我们将为你定制专属的知识库结构。</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 w-full">
               {identities.map(item => (
                 <button 
                   key={item.id}
                   onClick={() => handleOnboardingComplete(item.name, item.folders)}
                   className="flex flex-col items-center gap-4 p-6 rounded-xl bg-slate-50 dark:bg-slate-700/50 hover:bg-brand-50 dark:hover:bg-brand-900/30 border-2 border-transparent hover:border-brand-500 transition-all duration-200 group"
                 >
                    <div className="p-4 bg-white dark:bg-slate-800 rounded-full shadow-sm group-hover:scale-110 transition-transform text-brand-600">
                      {item.icon}
                    </div>
                    <span className="font-medium text-slate-700 dark:text-slate-200">{item.name}</span>
                 </button>
               ))}
            </div>

            <button 
              onClick={() => handleOnboardingComplete('通用用户', ['Personal', 'Work', 'Ideas'])}
              className="mt-8 text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 underline"
            >
              跳过，我只想创建一个空白知识库
            </button>
         </div>
      </div>
    );
  };

  const renderSidebar = () => (
    <div className="w-64 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-r border-gray-200/50 dark:border-gray-800/50 flex flex-col h-screen transition-colors duration-200 shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-20">
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-brand-600 font-bold text-xl tracking-tight">
          <BrainCircuit size={24} className="drop-shadow-sm" />
          <span className="bg-gradient-to-r from-brand-600 to-indigo-600 bg-clip-text text-transparent">CogniSphere</span>
        </div>
        <button onClick={handleThemeToggle} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors text-slate-500">
          {isDarkMode ? <Sun size={18} className="text-yellow-400"/> : <Moon size={18}/>}
        </button>
      </div>
      
      <div className="p-3 grid grid-cols-4 gap-2">
        <button 
          onClick={handleCreateNote}
          className="col-span-2 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white p-2.5 rounded-lg flex items-center justify-center gap-2 transition-all shadow-md shadow-brand-500/20 active:scale-95 text-sm font-medium"
        >
          <Plus size={18} /> 新建
        </button>
        
        <button 
          onClick={() => importFileRef.current?.click()}
          className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 p-2 rounded-lg flex items-center justify-center transition-all shadow-sm active:scale-95"
          title="导入文件"
        >
          <FileUp size={18} />
        </button>
        <input type="file" ref={importFileRef} className="hidden" accept=".md,.txt,.js,.json,.ts" onChange={handleImportFileNote} />

        <button 
          onClick={handleImportUrlNote}
          className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 p-2 rounded-lg flex items-center justify-center transition-all shadow-sm active:scale-95 relative"
          title="从链接导入"
          disabled={importing}
        >
          {importing ? <Loader2 size={18} className="animate-spin text-brand-500" /> : <LinkIcon size={18} />}
        </button>
      </div>

      <div className="px-4 pb-2">
         <div className="flex bg-gray-100/50 dark:bg-slate-800/50 rounded-lg p-1 mb-3 backdrop-blur-sm">
           <button onClick={() => setViewMode('card')} className={`flex-1 p-1.5 rounded-md text-center transition-all ${viewMode === 'card' ? 'bg-white dark:bg-slate-700 shadow-sm text-brand-600 dark:text-brand-400' : 'text-gray-400 hover:text-gray-600'}`} title="卡片"><LayoutGrid size={16} className="mx-auto"/></button>
           <button onClick={() => setViewMode('table')} className={`flex-1 p-1.5 rounded-md text-center transition-all ${viewMode === 'table' ? 'bg-white dark:bg-slate-700 shadow-sm text-brand-600 dark:text-brand-400' : 'text-gray-400 hover:text-gray-600'}`} title="列表"><List size={16} className="mx-auto"/></button>
           <button onClick={() => setViewMode('tree')} className={`flex-1 p-1.5 rounded-md text-center transition-all ${viewMode === 'tree' ? 'bg-white dark:bg-slate-700 shadow-sm text-brand-600 dark:text-brand-400' : 'text-gray-400 hover:text-gray-600'}`} title="目录"><FolderTree size={16} className="mx-auto"/></button>
         </div>
        <div className="relative group">
          <Search className="absolute left-3 top-2.5 text-gray-400 group-focus-within:text-brand-500 transition-colors" size={16} />
          <input 
            type="text" 
            placeholder="搜索知识库..." 
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full bg-gray-100/50 dark:bg-slate-800/50 pl-9 pr-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:bg-white dark:focus:bg-slate-800 transition-all dark:text-gray-200"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 space-y-1 custom-scrollbar">
        {viewMode === 'tree' ? renderTreeView() : (
          filteredNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center text-gray-400 mt-20 text-sm gap-2">
               <div className="w-12 h-12 bg-gray-50 dark:bg-slate-800 rounded-full flex items-center justify-center">
                 <Search size={20} className="opacity-50"/>
               </div>
               <p>{importing ? "正在智能解析..." : "暂无笔记"}</p>
            </div>
          ) : (
            filteredNotes.map(note => (
              <div 
                key={note.id}
                onClick={() => setActiveNoteId(note.id)}
                className={`relative p-3 rounded-lg cursor-pointer group transition-all duration-200 border border-transparent ${activeNoteId === note.id ? 'bg-brand-50/80 dark:bg-brand-900/20 border-brand-200 dark:border-brand-800/30 shadow-sm' : 'hover:bg-white/50 dark:hover:bg-slate-800/50 hover:border-gray-100 dark:hover:border-slate-700'}`}
              >
                <div className="flex justify-between items-start">
                   <h3 className={`font-medium truncate w-full ${activeNoteId === note.id ? 'text-brand-700 dark:text-brand-300' : 'text-slate-700 dark:text-slate-200'}`}>{note.title}</h3>
                </div>
                {viewMode === 'card' && (
                  <>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate font-light opacity-80">{note.content.substring(0, 60) || "无预览内容"}</p>
                    <div className="flex gap-1.5 mt-2.5 flex-wrap">
                      {note.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="text-[10px] bg-white dark:bg-slate-700 px-2 py-0.5 rounded-full border border-gray-100 dark:border-gray-600 text-gray-500 dark:text-gray-300 shadow-sm">#{tag}</span>
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
      </div>

      <div className="p-4 border-t border-gray-200/50 dark:border-gray-800/50 space-y-1 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md">
        <button 
          onClick={() => { setActiveNoteId(null); setViewMode('graph'); }}
          className={`flex items-center gap-2 w-full p-2.5 rounded-lg text-sm transition-all ${viewMode === 'graph' ? 'bg-brand-50 text-brand-600 font-medium' : 'text-slate-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800'}`}
        >
          <Share2 size={16} /> 知识图谱
        </button>
        <button 
          onClick={() => setSettingsOpen(true)}
          className="flex items-center gap-2 w-full p-2.5 rounded-lg text-sm text-slate-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-all"
        >
          <Settings size={16} /> 设置与备份
        </button>
      </div>
    </div>
  );

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
      <div className="space-y-1 pl-1">
         {Object.keys(treeStructure).sort().map(folder => (
            <div key={folder} className="mb-2">
              <div className="flex items-center gap-2 p-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
                 <Folder size={12} className="text-brand-400" /> {folder}
              </div>
              <div className="pl-3 border-l-2 border-gray-100 dark:border-slate-800 ml-1.5 space-y-0.5">
                {treeStructure[folder].map(note => (
                  <div 
                    key={note.id}
                    onClick={() => setActiveNoteId(note.id)}
                    className={`flex items-center gap-2 p-2 rounded-md text-sm cursor-pointer transition-all ${activeNoteId === note.id ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300 font-medium' : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm'}`}
                  >
                    <FileText size={14} className="opacity-70" /> <span className="truncate">{note.title}</span>
                  </div>
                ))}
              </div>
            </div>
         ))}
         {rootNotes.length > 0 && (
           <div className="mt-2">
              <div className="flex items-center gap-2 p-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
                 <Folder size={12} className="opacity-50" /> 未分类
              </div>
              <div className="pl-3 border-l-2 border-gray-100 dark:border-slate-800 ml-1.5 space-y-0.5">
                {rootNotes.map(note => (
                  <div 
                    key={note.id}
                    onClick={() => setActiveNoteId(note.id)}
                    className={`flex items-center gap-2 p-2 rounded-md text-sm cursor-pointer transition-all ${activeNoteId === note.id ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300 font-medium' : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm'}`}
                  >
                    <FileText size={14} className="opacity-70" /> <span className="truncate">{note.title}</span>
                  </div>
                ))}
              </div>
           </div>
         )}
      </div>
    );
  };

  const renderEditor = () => {
    if (!activeNote) return (
      <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden bg-gray-50/30 dark:bg-dark-bg">
        {/* Background blobs */}
        <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-brand-400/20 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-1/3 right-1/3 w-80 h-80 bg-purple-400/20 rounded-full blur-[80px] animate-pulse delay-1000"></div>
        
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-3xl shadow-xl flex items-center justify-center mb-6 text-brand-500 transform rotate-12">
            <BrainCircuit size={40} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">准备好记录想法了吗？</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-md text-center">CogniSphere 是您的第二大脑。从左侧选择笔记，或使用下方快捷方式。</p>
          
          <div className="grid grid-cols-2 gap-4">
             <button onClick={() => createNewNote()} className="flex items-center gap-3 p-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-100 dark:border-slate-700 group text-left">
                <div className="p-2 bg-brand-50 dark:bg-brand-900/30 rounded-lg text-brand-600 dark:text-brand-400 group-hover:scale-110 transition-transform"><Plus size={20}/></div>
                <div>
                  <div className="font-medium text-slate-700 dark:text-slate-200">新建笔记</div>
                  <div className="text-xs text-slate-400">空白 Markdown</div>
                </div>
             </button>
             <button onClick={() => importFileRef.current?.click()} className="flex items-center gap-3 p-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-100 dark:border-slate-700 group text-left">
                <div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform"><Upload size={20}/></div>
                <div>
                  <div className="font-medium text-slate-700 dark:text-slate-200">导入文件</div>
                  <div className="text-xs text-slate-400">支持 MD, TXT, Code</div>
                </div>
             </button>
          </div>
        </div>
      </div>
    );

    return (
      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-white/50 dark:bg-dark-bg/50 backdrop-blur-sm transition-colors duration-200 relative">
        {/* Background gradient for editor */}
        <div className="absolute inset-0 bg-gradient-to-br from-white via-white to-gray-50 dark:from-dark-bg dark:via-dark-bg dark:to-slate-900 -z-10"></div>

        {/* Toolbar */}
        <div className="h-16 border-b border-gray-200/50 dark:border-gray-800/50 flex items-center justify-between px-6 bg-white/80 dark:bg-dark-bg/80 backdrop-blur-md shrink-0 sticky top-0 z-10">
          <div className="flex flex-col w-1/2">
            <input 
              value={activeNote.title}
              onChange={(e) => handleUpdateNote(activeNote.id, { title: e.target.value })}
              className="text-xl font-bold bg-transparent border-none focus:outline-none text-slate-800 dark:text-slate-100 placeholder-gray-300 dark:placeholder-gray-700"
              placeholder="笔记标题..."
            />
          </div>
          
          <div className="flex items-center gap-2">
             {loadingAI && (
               <div className="flex items-center gap-2 px-3 py-1.5 bg-brand-50 dark:bg-brand-900/20 rounded-full mr-2 border border-brand-100 dark:border-brand-800/50">
                 <Loader2 size={14} className="animate-spin text-brand-500"/>
                 <span className="text-xs text-brand-600 dark:text-brand-400 font-medium">AI 思考中...</span>
               </div>
             )}
             
             <div className="h-8 w-[1px] bg-gray-200 dark:bg-gray-700 mx-2"></div>

             <button 
               onClick={() => fileInputRef.current?.click()}
               className="p-2 text-slate-500 hover:text-brand-600 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
               title="插入图片"
             >
               <ImageIcon size={18} />
             </button>
             <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />

             <button 
               onClick={() => setHistoryModalOpen(true)}
               className="p-2 text-slate-500 hover:text-brand-600 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
               title="版本历史"
             >
               <History size={18} />
             </button>

             {/* Improved AI Menu */}
             <div className="relative z-20" ref={aiMenuRef}>
                <button 
                  onClick={() => setAiMenuOpen(!aiMenuOpen)}
                  className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-all border ${aiMenuOpen ? 'bg-brand-50 dark:bg-slate-700 border-brand-200 text-brand-600' : 'text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
                >
                  <Sparkles size={16} className={aiMenuOpen ? "text-brand-500" : "text-purple-500"} /> AI 工具
                </button>
                
                {aiMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-slate-800 shadow-2xl rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-3 bg-gray-50/50 dark:bg-slate-900/50 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">智能指令</span>
                      <span className="text-[10px] text-gray-400 bg-gray-200 dark:bg-slate-700 px-1.5 py-0.5 rounded">Gemini / OpenAI</span>
                    </div>
                    <div className="p-1.5 space-y-0.5 max-h-80 overflow-y-auto">
                      {templates.map(t => (
                        <button 
                          key={t.id}
                          onClick={() => handleAIAction(t)}
                          className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-brand-50 dark:hover:bg-slate-700 group transition-colors"
                        >
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-200 group-hover:text-brand-700 dark:group-hover:text-brand-300">{t.name}</span>
                            <Wand2 size={12} className="opacity-0 group-hover:opacity-100 text-brand-500 transition-opacity" />
                          </div>
                          <p className="text-xs text-gray-400 line-clamp-1">{t.description}</p>
                        </button>
                      ))}
                    </div>
                    <div className="p-2 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-slate-900/30">
                      <button onClick={() => { setSettingsOpen(true); setSettingsTab('prompts'); setAiMenuOpen(false); }} className="w-full py-1.5 text-xs text-center text-gray-500 hover:text-brand-600 hover:underline">
                        管理提示词模板
                      </button>
                    </div>
                  </div>
                )}
             </div>

             <button 
                onClick={(e) => handleDeleteNote(e, activeNote.id)}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors ml-1" 
                title="删除笔记"
              >
               <Trash2 size={18} />
             </button>
          </div>
        </div>

        {/* Meta Bar */}
        <div className="px-6 py-2 bg-white/50 dark:bg-dark-card/30 flex items-center gap-4 border-b border-gray-100/50 dark:border-gray-800/50 shrink-0 backdrop-blur-sm">
           <div className="flex items-center gap-2 flex-1 max-w-xs relative group bg-gray-100/50 dark:bg-slate-800/50 px-2 py-1 rounded-md transition-colors focus-within:bg-white dark:focus-within:bg-slate-800 focus-within:ring-1 focus-within:ring-brand-200">
             <Folder size={14} className="text-gray-400" />
             <input 
               className="bg-transparent text-xs focus:outline-none text-slate-600 dark:text-slate-400 w-full placeholder-gray-400"
               placeholder="文件夹 (例: Work/Project)..."
               value={activeNote.folder}
               onChange={(e) => handleUpdateNote(activeNote.id, { folder: e.target.value })}
             />
           </div>
           
           <div className="flex items-center gap-2 flex-1 bg-gray-100/50 dark:bg-slate-800/50 px-2 py-1 rounded-md transition-colors focus-within:bg-white dark:focus-within:bg-slate-800 focus-within:ring-1 focus-within:ring-brand-200">
             <TagIcon size={14} className="text-gray-400" />
             <input 
               className="bg-transparent text-xs focus:outline-none text-slate-600 dark:text-slate-400 w-full placeholder-gray-400"
               placeholder="标签 (用逗号分隔)..."
               value={activeNote.tags.join(', ')}
               onChange={(e) => handleUpdateNote(activeNote.id, { tags: e.target.value.split(/[,，]/).map(t => t.trim()).filter(Boolean) })}
             />
           </div>
        </div>

        {/* Content Area - Split View */}
        <div className="flex-1 flex overflow-hidden">
          {/* Editor */}
          <textarea
            className="flex-1 p-8 resize-none focus:outline-none bg-transparent text-slate-800 dark:text-slate-200 font-mono text-sm leading-7 border-r border-gray-100 dark:border-gray-800/50"
            value={activeNote.content}
            onChange={(e) => handleUpdateNote(activeNote.id, { content: e.target.value })}
            placeholder="# 开始你的创作...\n支持 Markdown 语法"
            onPaste={(e) => {
               const items = e.clipboardData.items;
               for (let i = 0; i < items.length; i++) {
                 if (items[i].type.indexOf('image') !== -1) {
                   const blob = items[i].getAsFile();
                   if (blob) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const base64 = event.target?.result as string;
                        const imageMarkdown = `\n![Pasted Image](${base64})\n`;
                        const textarea = e.target as HTMLTextAreaElement;
                        const start = textarea.selectionStart;
                        const end = textarea.selectionEnd;
                        const text = textarea.value;
                        const newText = text.substring(0, start) + imageMarkdown + text.substring(end);
                        handleUpdateNote(activeNote.id, { content: newText }, true);
                      };
                      reader.readAsDataURL(blob);
                   }
                 }
               }
            }}
          />
          
          {/* Preview */}
          <div className="flex-1 p-8 overflow-y-auto prose dark:prose-invert prose-sm max-w-none prose-pre:bg-gray-100 dark:prose-pre:bg-slate-800 prose-img:rounded-lg prose-img:shadow-lg">
             {activeNote.content ? <ReactMarkdown>{activeNote.content}</ReactMarkdown> : <div className="flex flex-col items-center justify-center h-full opacity-30">
               <Book size={48} className="mb-4"/>
               <p>预览区域</p>
             </div>}
          </div>
        </div>
        
        {/* Footer info */}
        <div className="h-8 border-t border-gray-200/50 dark:border-gray-800/50 flex items-center justify-between px-6 text-[10px] text-gray-400 bg-white/50 dark:bg-dark-card/50 select-none shrink-0 backdrop-blur-sm">
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

  const renderGraphView = () => (
     <div className="flex-1 flex flex-col h-screen bg-gray-50/50 dark:bg-dark-bg/50 backdrop-blur-sm relative">
        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] -z-10 opacity-50"></div>
        
        <div className="p-6 border-b border-gray-200/50 dark:border-gray-800/50 bg-white/80 dark:bg-dark-card/80 backdrop-blur-md flex justify-between items-center shadow-sm z-10">
           <div>
             <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
               <Share2 className="text-brand-500" /> 知识图谱
             </h2>
             <p className="text-sm text-gray-500 mt-1">可视化展示 {notes.length} 条笔记之间的语义关联。</p>
           </div>
           <button 
             onClick={() => { setViewMode('card'); }}
             className="px-4 py-2 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg shadow-sm text-sm hover:bg-gray-50 hover:shadow-md transition-all flex items-center gap-2 dark:text-white"
           >
             <X size={16}/> 关闭图谱
           </button>
        </div>
        <div className="flex-1 overflow-hidden relative">
           <KnowledgeGraph 
             notes={notes} 
             onNodeClick={(id) => {
               setActiveNoteId(id);
               setViewMode('card');
             }} 
            />
        </div>
     </div>
  );

  const renderHistoryModal = () => {
    if (!historyModalOpen || !activeNote) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
         <div className="bg-white dark:bg-slate-900 w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700 flex flex-col transform transition-all scale-100">
            <div className="p-5 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/50">
              <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">
                <History size={20} className="text-brand-600" /> 历史版本回溯
              </h3>
              <button onClick={() => setHistoryModalOpen(false)} className="p-2 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full transition-colors"><X size={20} className="text-gray-500"/></button>
            </div>
            
            <div className="flex-1 flex overflow-hidden">
               {/* List */}
               <div className="w-72 border-r border-gray-200 dark:border-gray-800 overflow-y-auto bg-gray-50/50 dark:bg-slate-900/50">
                  <div className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">历史快照 ({activeNote.versions.length})</div>
                  {activeNote.versions.length === 0 && <div className="p-8 text-sm text-gray-400 text-center italic">暂无历史版本<br/>编辑内容后自动生成</div>}
                  {activeNote.versions.map((v, i) => (
                    <div key={v.timestamp} className="p-4 border-b border-gray-100 dark:border-slate-800/50 hover:bg-white dark:hover:bg-slate-800 cursor-default group transition-colors">
                       <div className="flex justify-between items-start">
                         <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{new Date(v.timestamp).toLocaleString()}</span>
                       </div>
                       <div className="flex items-center gap-2 mt-2">
                          <span className="text-[10px] bg-gray-200 dark:bg-slate-700 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-400">{v.content.length} 字符</span>
                       </div>
                       <button 
                         onClick={() => handleRestoreVersion(v)}
                         className="mt-3 w-full flex items-center justify-center gap-2 text-xs bg-white border border-gray-200 dark:bg-slate-700 dark:border-slate-600 hover:border-brand-300 hover:text-brand-600 py-1.5 rounded shadow-sm opacity-60 group-hover:opacity-100 transition-all"
                       >
                         <RotateCcw size={12} /> 恢复此版本
                       </button>
                    </div>
                  ))}
               </div>
               
               {/* Preview */}
               <div className="flex-1 p-8 overflow-y-auto bg-white dark:bg-dark-bg">
                  <div className="prose dark:prose-invert max-w-none">
                     <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/10 text-yellow-800 dark:text-yellow-200 text-sm rounded-lg border border-yellow-100 dark:border-yellow-900/30 flex items-start gap-3">
                        <div className="mt-0.5"><History size={16}/></div>
                        <div>
                          <strong>版本预览模式</strong>
                          <p className="mt-1 opacity-80">当前显示的是历史内容。点击左侧列表中的“恢复此版本”按钮可将笔记回滚到该状态。</p>
                        </div>
                     </div>
                     <div className="pl-4 border-l-4 border-brand-200 dark:border-brand-900">
                        <ReactMarkdown>{activeNote.content}</ReactMarkdown>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </div>
    );
  };

  const renderSettingsModal = () => {
    if (!settingsOpen) return null;
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700 flex flex-col max-h-[85vh]">
           <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/50">
             <h3 className="font-bold text-xl dark:text-white flex items-center gap-2">
               <Settings size={24} className="text-brand-600" /> 系统偏好设置
             </h3>
             <button onClick={() => setSettingsOpen(false)} className="p-2 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full transition-colors"><X size={20} className="text-gray-500"/></button>
           </div>
           
           <div className="flex border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-900">
              <button onClick={() => setSettingsTab('general')} className={`flex-1 py-4 text-sm font-medium transition-colors ${settingsTab === 'general' ? 'text-brand-600 border-b-2 border-brand-600 bg-brand-50/10' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:hover:bg-slate-800'}`}>常规 & AI 模型</button>
              <button onClick={() => setSettingsTab('prompts')} className={`flex-1 py-4 text-sm font-medium transition-colors ${settingsTab === 'prompts' ? 'text-brand-600 border-b-2 border-brand-600 bg-brand-50/10' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:hover:bg-slate-800'}`}>提示词模板管理</button>
              <button onClick={() => setSettingsTab('data')} className={`flex-1 py-4 text-sm font-medium transition-colors ${settingsTab === 'data' ? 'text-brand-600 border-b-2 border-brand-600 bg-brand-50/10' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:hover:bg-slate-800'}`}>数据备份与恢复</button>
           </div>

           <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar flex-1 bg-white dark:bg-slate-900">
             
             {settingsTab === 'general' && (
               <div className="space-y-8">
                  <div className="grid grid-cols-2 gap-6">
                     <div className="space-y-2">
                       <label className="text-sm font-semibold text-gray-900 dark:text-gray-100">用户昵称</label>
                       <input 
                         className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
                         value={settings.userName}
                         onChange={(e) => setSettings({ ...settings, userName: e.target.value })}
                       />
                     </div>
                     <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-900 dark:text-gray-100 block mb-2">界面主题</label>
                        <div className="flex gap-2 p-1 bg-gray-100 dark:bg-slate-800 rounded-lg inline-flex">
                           <button onClick={() => { setIsDarkMode(false); document.documentElement.classList.remove('dark'); setSettings({...settings, theme: 'light'}); }} className={`px-4 py-1.5 rounded-md text-sm transition-all ${!isDarkMode ? 'bg-white shadow-sm text-brand-600' : 'text-gray-500'}`}>明亮</button>
                           <button onClick={() => { setIsDarkMode(true); document.documentElement.classList.add('dark'); setSettings({...settings, theme: 'dark'}); }} className={`px-4 py-1.5 rounded-md text-sm transition-all ${isDarkMode ? 'bg-slate-600 shadow-sm text-white' : 'text-gray-500'}`}>暗黑</button>
                        </div>
                     </div>
                  </div>

                  <div className="border-t border-gray-100 dark:border-gray-800"></div>

                  <div className="space-y-5">
                    <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                      <Sparkles size={18} className="text-brand-500"/> AI 模型配置
                    </h4>
                    
                    <div className="bg-gray-50 dark:bg-slate-800/50 p-6 rounded-xl border border-gray-200 dark:border-gray-700 space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">服务提供商</label>
                        <div className="relative">
                          <select 
                            className="w-full appearance-none p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none transition-shadow cursor-pointer"
                            value={settings.aiConfig.provider}
                            onChange={(e) => {
                              const newProvider = e.target.value as AIProvider;
                              const providerDefaults = PROVIDERS.find(p => p.id === newProvider);
                              setSettings({
                                ...settings,
                                aiConfig: {
                                  ...settings.aiConfig,
                                  provider: newProvider,
                                  baseUrl: providerDefaults?.defaultBaseUrl || '',
                                  modelName: providerDefaults?.defaultModel || ''
                                }
                              });
                            }}
                          >
                            {PROVIDERS.map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-3 top-3.5 text-gray-400 pointer-events-none" size={16} />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="col-span-2">
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                            API Key <span className="text-red-500">*</span>
                          </label>
                          <input 
                            type="password"
                            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-900 dark:text-white font-mono text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all"
                            value={settings.aiConfig.apiKey}
                            onChange={(e) => setSettings({ ...settings, aiConfig: { ...settings.aiConfig, apiKey: e.target.value } })}
                            placeholder="sk-..."
                          />
                        </div>

                        {settings.aiConfig.provider !== 'google' && (
                          <div className="col-span-2">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Base URL</label>
                            <input 
                              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-900 dark:text-white font-mono text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all"
                              value={settings.aiConfig.baseUrl}
                              onChange={(e) => setSettings({ ...settings, aiConfig: { ...settings.aiConfig, baseUrl: e.target.value } })}
                              placeholder="https://api.example.com/v1"
                            />
                          </div>
                        )}

                        <div className="col-span-2">
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">模型名称</label>
                          <input 
                            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-900 dark:text-white font-mono text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all"
                            value={settings.aiConfig.modelName}
                            onChange={(e) => setSettings({ ...settings, aiConfig: { ...settings.aiConfig, modelName: e.target.value } })}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
                      <div>
                        <span className="text-sm font-bold text-indigo-900 dark:text-indigo-300 block">启用语义搜索 (RAG)</span>
                        <span className="text-xs text-indigo-600 dark:text-indigo-400">使用 Vector Embeddings 增强搜索结果，不仅仅是关键词匹配。</span>
                      </div>
                      <button 
                          onClick={() => setSettings({ ...settings, useSemanticSearch: !settings.useSemanticSearch })}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${settings.useSemanticSearch ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-700'}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${settings.useSemanticSearch ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>
                  </div>
               </div>
             )}

             {settingsTab === 'prompts' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                        <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100">自定义提示词模板</h4>
                        <p className="text-xs text-gray-500 mt-1">定制 AI 处理笔记的方式。使用 {"{{content}}"} 代表当前笔记内容。</p>
                    </div>
                    <button 
                      onClick={() => {
                        const newId = Date.now().toString();
                        const newTemplate = { id: newId, name: '新指令', template: '{{content}}', description: '描述这个指令的作用' };
                        setTemplates([...templates, newTemplate]);
                        StorageService.saveTemplate(newTemplate);
                      }}
                      className="text-xs bg-brand-600 text-white px-3 py-2 rounded-lg hover:bg-brand-700 shadow-sm transition-colors flex items-center gap-1"
                    >
                      <Plus size={14}/> 添加指令
                    </button>
                  </div>
                  <div className="space-y-4">
                     {templates.map((t, idx) => (
                       <div key={t.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-slate-800 shadow-sm hover:shadow-md transition-shadow group">
                          <div className="flex gap-3 mb-3">
                            <input 
                              className="flex-1 p-2 text-sm font-bold bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                              value={t.name}
                              onChange={(e) => {
                                const newT = { ...t, name: e.target.value };
                                const list = [...templates]; list[idx] = newT;
                                setTemplates(list);
                              }}
                            />
                            <button onClick={async () => {
                               if(!window.confirm("确认删除此模板？")) return;
                               const list = templates.filter(item => item.id !== t.id);
                               setTemplates(list);
                            }} className="text-gray-400 hover:text-red-500 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"><Trash2 size={16}/></button>
                          </div>
                          <textarea 
                             className="w-full p-3 text-xs font-mono bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none leading-relaxed"
                             rows={3}
                             value={t.template}
                             onChange={(e) => {
                                const newT = { ...t, template: e.target.value };
                                const list = [...templates]; list[idx] = newT;
                                setTemplates(list);
                              }}
                          />
                          <input 
                              className="w-full mt-2 p-1.5 text-xs bg-transparent border-b border-gray-200 dark:border-gray-700 focus:border-brand-500 outline-none text-gray-500 dark:text-gray-400"
                              value={t.description}
                              placeholder="添加简短描述..."
                              onChange={(e) => {
                                const newT = { ...t, description: e.target.value };
                                const list = [...templates]; list[idx] = newT;
                                setTemplates(list);
                              }}
                           />
                       </div>
                     ))}
                     <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                        <button onClick={() => {
                            templates.forEach(t => StorageService.saveTemplate(t));
                            alert("所有模板已保存");
                        }} className="w-full py-3 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium transition-colors">
                            保存所有更改
                        </button>
                     </div>
                  </div>
                </div>
             )}

             {settingsTab === 'data' && (
                <div className="space-y-6">
                   <div className="p-6 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30">
                      <h4 className="text-base font-bold text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2"><Download size={20}/> 备份数据</h4>
                      <p className="text-sm text-blue-600 dark:text-blue-400 mb-4 leading-relaxed">将所有笔记、设置和自定义模板打包导出为 JSON 文件。建议定期备份以防止数据丢失。</p>
                      <button onClick={handleExportData} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm shadow-blue-500/20">下载备份文件</button>
                   </div>
                   
                   <div className="p-6 bg-orange-50 dark:bg-orange-900/10 rounded-xl border border-orange-100 dark:border-orange-900/30">
                      <h4 className="text-base font-bold text-orange-800 dark:text-orange-300 mb-2 flex items-center gap-2"><Upload size={20}/> 恢复数据</h4>
                      <p className="text-sm text-orange-600 dark:text-orange-400 mb-4 leading-relaxed">从 JSON 备份文件中恢复知识库。请注意，这可能会覆盖现有的同名笔记，请谨慎操作。</p>
                      <label className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer inline-flex items-center gap-2 shadow-sm shadow-orange-500/20">
                        选择文件
                        <input type="file" className="hidden" accept=".json" onChange={handleImportData} />
                      </label>
                   </div>
                </div>
             )}

           </div>

           <div className="p-5 bg-gray-50/80 dark:bg-slate-800/80 flex justify-end border-t border-gray-200 dark:border-gray-700 shrink-0 backdrop-blur-sm">
             <button 
               onClick={async () => {
                 await StorageService.saveSettings(settings);
                 setSettingsOpen(false);
               }}
               className="bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-slate-900 px-8 py-2.5 rounded-xl font-medium text-sm transition-all shadow-lg shadow-slate-900/10 active:scale-95 flex items-center gap-2"
             >
               <Check size={16} /> 完成设置
             </button>
           </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex w-full h-screen font-sans text-slate-900 dark:text-slate-200 bg-white dark:bg-dark-bg selection:bg-brand-200 dark:selection:bg-brand-900 overflow-hidden">
      {renderSidebar()}
      {viewMode === 'graph' ? renderGraphView() : renderEditor()}
      {renderSettingsModal()}
      {renderHistoryModal()}
      {renderOnboardingModal()}
    </div>
  );
};

export default App;