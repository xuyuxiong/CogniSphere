
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
  FileCode,
  Rss,
  Newspaper,
  ExternalLink,
  BookOpen
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { StorageService } from './services/storageService';
import { AIService } from './services/geminiService';
import { RSSService, DEFAULT_FEEDS } from './services/rssService';
import { KnowledgeGraph } from './components/KnowledgeGraph';
import { Note, AppSettings, NoteType, AIProvider, PromptTemplate, AIModelConfig, NoteVersion, RSSFeed, RSSItem } from './types';

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
  const [appMode, setAppMode] = useState<'notes' | 'reader'>('notes'); // New: Switch between KB and Reader
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
    userName: 'Engineer'
  });
  
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'general' | 'prompts' | 'data'>('general');
  const [loadingAI, setLoadingAI] = useState(false);
  const [importing, setImporting] = useState(false);
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  // --- RSS State ---
  const [rssFeeds, setRssFeeds] = useState<RSSFeed[]>([]);
  const [activeFeedUrl, setActiveFeedUrl] = useState<string | null>(null);
  const [feedItems, setFeedItems] = useState<RSSItem[]>([]);
  const [activeRssItem, setActiveRssItem] = useState<RSSItem | null>(null);
  const [loadingFeed, setLoadingFeed] = useState(false);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importFileRef = useRef<HTMLInputElement>(null);

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
        setSettings(storedSettings);
        if (storedSettings.theme === 'dark') {
          document.documentElement.classList.add('dark');
          setIsDarkMode(true);
        }
      }

      const storedTemplates = await StorageService.getTemplates();
      setTemplates(storedTemplates);

      // Load RSS Feeds
      const feeds = await StorageService.getRSSFeeds();
      if (feeds.length === 0) {
        // Seed Defaults
        setRssFeeds(DEFAULT_FEEDS);
        DEFAULT_FEEDS.forEach(f => StorageService.saveRSSFeed(f));
      } else {
        setRssFeeds(feeds);
      }
    };
    loadData();
  }, []);

  // Fetch items when active feed changes
  useEffect(() => {
    if (!activeFeedUrl) {
      setFeedItems([]);
      return;
    }
    const fetchItems = async () => {
      setLoadingFeed(true);
      try {
        const { items } = await RSSService.fetchFeed(activeFeedUrl);
        setFeedItems(items);
        setActiveRssItem(null); // Clear active item when switching feeds
      } catch (e) {
        alert("无法加载该 RSS 源，请检查网络或源地址。");
        console.error(e);
      } finally {
        setLoadingFeed(false);
      }
    };
    fetchItems();
  }, [activeFeedUrl]);

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
    setAppMode('notes'); // Switch back to notes if creating from Reader
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
      alert(`导入失败: ${e.message}。请检查链接是否公开可访问。`);
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
    if (!window.confirm(`确定要回滚到 ${new Date(version.timestamp).toLocaleString()} 的版本吗？当前未保存的内容将作为新历史版本保存。`)) return;
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
        await AIService.semanticSearch(query, notes, settings.aiConfig);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingAI(false);
      }
    }
  };

  // --- RSS Handlers ---
  const handleAddRSS = async () => {
    const url = prompt("请输入 RSS Feed 地址：");
    if (!url) return;
    
    // Quick validate
    if (!url.startsWith('http')) return alert("请输入有效的 URL");

    try {
      setLoadingFeed(true);
      const { feed } = await RSSService.fetchFeed(url);
      
      // Check duplicate
      if (rssFeeds.some(f => f.url === feed.url)) {
        alert("该订阅源已存在");
        return;
      }

      await StorageService.saveRSSFeed(feed);
      setRssFeeds(prev => [...prev, feed]);
      setActiveFeedUrl(feed.url);
    } catch (e) {
      alert("添加失败：无法解析 RSS 源");
    } finally {
      setLoadingFeed(false);
    }
  };

  const handleDeleteRSS = async (e: React.MouseEvent, url: string) => {
    e.stopPropagation();
    if (!window.confirm("确定要取消订阅吗？")) return;
    await StorageService.deleteRSSFeed(url);
    setRssFeeds(prev => prev.filter(f => f.url !== url));
    if (activeFeedUrl === url) {
      setActiveFeedUrl(null);
      setFeedItems([]);
      setActiveRssItem(null);
    }
  };

  const handleClipRSSItem = async (item: RSSItem) => {
    // Convert HTML content to Markdown approx or just keep HTML (ReactMarkdown can handle some html or use html directly)
    // For MVP, we pass the content directly.
    await createNewNote({
      title: item.title,
      content: `> 原文: [${item.title}](${item.link}) \n> 来源: ${item.feedTitle} \n\n ${item.description} \n\n --- \n\n ${item.content}`,
      tags: ['RSS', 'Clipping'],
      folder: 'Reading'
    });
    alert("已剪藏到“Reading”文件夹！");
  };

  // --- AI & Features ---

  const handleAIAction = async (template: PromptTemplate) => {
    if (!activeNote || !settings.aiConfig.apiKey) return alert("请先在设置中配置 API Key");
    setLoadingAI(true);
    try {
      const prompt = template.template.replace('{{content}}', activeNote.content);
      const result = await AIService.generateText(prompt, settings.aiConfig);
      
      if (template.name.includes("标签")) {
         const newTags = result.split(/[,，]/).map(t => t.trim()).filter(Boolean);
         const uniqueTags = Array.from(new Set([...activeNote.tags, ...newTags]));
         handleUpdateNote(activeNote.id, { tags: uniqueTags });
      } else {
        const newContent = activeNote.content + `\n\n> **AI (${template.name}):**\n\n` + result;
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
    const data = {
      notes,
      settings,
      templates,
      rssFeeds,
      exportDate: new Date().toISOString(),
      appVersion: '1.0.0'
    };
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
           if (!window.confirm(`检测到备份包含 ${data.notes.length} 条笔记。导入将覆盖当前同名ID数据或添加新数据。是否继续？`)) return;
           
           for (const n of data.notes) await StorageService.saveNote(n);
           if (data.templates) for (const t of data.templates) await StorageService.saveTemplate(t);
           if (data.rssFeeds) for (const f of data.rssFeeds) await StorageService.saveRSSFeed(f);
           
           const newNotes = await StorageService.getNotes();
           setNotes(newNotes);
           const newFeeds = await StorageService.getRSSFeeds();
           setRssFeeds(newFeeds);
           
           alert("导入成功！");
        } else {
          alert("无效的备份文件格式");
        }
      } catch (err) {
        alert("导入失败: JSON 解析错误");
      }
    };
    reader.readAsText(file);
  };

  // --- Sub-Renderers ---

  const renderSidebar = () => (
    <div className="w-64 bg-white dark:bg-dark-card border-r border-gray-200 dark:border-gray-800 flex flex-col h-screen transition-colors duration-200 shrink-0 z-20">
      <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2 text-brand-600 font-bold text-xl">
          <BrainCircuit size={24} />
          <span>CogniSphere</span>
        </div>
        <button onClick={handleThemeToggle} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
          {isDarkMode ? <Sun size={18} className="text-yellow-400"/> : <Moon size={18} className="text-slate-600"/>}
        </button>
      </div>

      {/* Main Nav Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-800">
        <button 
          onClick={() => setAppMode('notes')}
          className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${appMode === 'notes' ? 'text-brand-600 border-b-2 border-brand-600 bg-brand-50/50 dark:bg-brand-900/10' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
        >
          <Book size={16} /> 知识库
        </button>
        <button 
          onClick={() => setAppMode('reader')}
          className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${appMode === 'reader' ? 'text-brand-600 border-b-2 border-brand-600 bg-brand-50/50 dark:bg-brand-900/10' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
        >
          <Rss size={16} /> 阅读室
        </button>
      </div>
      
      {appMode === 'notes' ? renderNotesSidebarContent() : renderRSSSidebarContent()}

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

  const renderNotesSidebarContent = () => (
    <>
      <div className="p-3 grid grid-cols-4 gap-1">
        <button 
          onClick={handleCreateNote}
          className="col-span-2 bg-brand-600 hover:bg-brand-700 text-white p-2 rounded-md flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95 text-sm font-medium"
          title="新建空白笔记"
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
            onChange={(e) => handleSearch(e.target.value)}
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
        
        {/* Graph View Trigger */}
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

  // Recursive Tree View Component logic
  const renderTreeView = () => {
    // Group notes by folder
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

  const renderEditor = () => {
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
             
             {/* Image Upload Trigger */}
             <button 
               onClick={() => fileInputRef.current?.click()}
               className="p-2 text-slate-500 hover:text-brand-600 hover:bg-gray-100 dark:hover:bg-slate-800 rounded transition-colors"
               title="插入图片/附件"
             >
               <ImageIcon size={18} />
             </button>
             <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />

             {/* History Trigger */}
             <button 
               onClick={() => setHistoryModalOpen(true)}
               className="p-2 text-slate-500 hover:text-brand-600 hover:bg-gray-100 dark:hover:bg-slate-800 rounded transition-colors"
               title="版本历史"
             >
               <History size={18} />
             </button>

             {/* AI Menu */}
             <div className="relative group z-10">
                <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 hover:bg-brand-50 dark:hover:bg-slate-700 hover:text-brand-600 rounded-md transition-all border border-transparent hover:border-brand-200">
                  <Wand2 size={16} /> AI 工具
                </button>
                <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-slate-800 shadow-xl rounded-lg border border-gray-200 dark:border-gray-700 hidden group-hover:block overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                   {/* Built-in quick actions can be added here */}
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

        {/* Content Area - Split View */}
        <div className="flex-1 flex overflow-hidden">
          {/* Editor */}
          <textarea
            className="flex-1 p-8 resize-none focus:outline-none bg-white dark:bg-dark-bg text-slate-800 dark:text-slate-200 font-mono text-sm leading-7 border-r border-gray-200 dark:border-gray-800"
            value={activeNote.content}
            onChange={(e) => handleUpdateNote(activeNote.id, { content: e.target.value })}
            placeholder="# 开始你的创作...\n支持 Markdown 语法\n粘贴图片或点击上方图标上传"
            onPaste={(e) => {
               // Handle paste image
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
          <div className="flex-1 p-8 overflow-y-auto prose dark:prose-invert prose-sm max-w-none bg-gray-50 dark:bg-slate-900/50">
             {activeNote.content ? <ReactMarkdown>{activeNote.content}</ReactMarkdown> : <div className="text-gray-400 italic">预览区域</div>}
          </div>
        </div>
        
        {/* Footer info */}
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

  const renderRSSReader = () => {
    if (!activeFeedUrl) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50 dark:bg-dark-bg">
          <Rss size={64} className="mb-4 opacity-20" />
          <p className="text-lg font-medium">RSS 阅读室</p>
          <p className="text-sm mt-2">选择左侧订阅源开始阅读</p>
        </div>
      );
    }

    return (
      <div className="flex-1 flex h-screen overflow-hidden bg-white dark:bg-dark-bg">
        {/* Feed Items List */}
        <div className="w-80 border-r border-gray-200 dark:border-gray-800 overflow-y-auto bg-gray-50 dark:bg-slate-900/30 flex flex-col">
           <div className="p-4 border-b border-gray-200 dark:border-gray-800 sticky top-0 bg-gray-50 dark:bg-slate-900/30 backdrop-blur z-10">
              <h3 className="font-bold text-slate-700 dark:text-slate-200 truncate">
                {rssFeeds.find(f => f.url === activeFeedUrl)?.title || '文章列表'}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                {loadingFeed ? '正在刷新...' : `${feedItems.length} 篇文章`}
              </p>
           </div>
           <div className="flex-1">
             {loadingFeed ? (
                <div className="flex justify-center p-8"><Loader2 className="animate-spin text-brand-500"/></div>
             ) : (
                feedItems.map((item, idx) => (
                  <div 
                    key={idx}
                    onClick={() => setActiveRssItem(item)}
                    className={`p-4 border-b border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-white dark:hover:bg-slate-800 transition-colors ${activeRssItem === item ? 'bg-white dark:bg-slate-800 border-l-4 border-l-brand-500' : 'border-l-4 border-l-transparent'}`}
                  >
                     <h4 className={`text-sm font-medium mb-1 line-clamp-2 ${activeRssItem === item ? 'text-brand-700 dark:text-brand-400' : 'text-slate-700 dark:text-slate-300'}`}>{item.title}</h4>
                     <div className="flex justify-between items-center text-[10px] text-gray-400 mt-2">
                       <span>{new Date(item.pubDate).toLocaleDateString()}</span>
                       <span>{item.author}</span>
                     </div>
                  </div>
                ))
             )}
           </div>
        </div>

        {/* Article Reader */}
        <div className="flex-1 overflow-y-auto p-8 bg-white dark:bg-dark-bg">
           {activeRssItem ? (
             <div className="max-w-3xl mx-auto pb-20">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">{activeRssItem.title}</h1>
                <div className="flex items-center gap-4 text-sm text-gray-500 mb-8 border-b border-gray-100 dark:border-gray-800 pb-4">
                   <span className="flex items-center gap-1"><BookOpen size={14}/> {activeRssItem.feedTitle}</span>
                   <span>•</span>
                   <span>{new Date(activeRssItem.pubDate).toLocaleString()}</span>
                   <div className="flex-1"></div>
                   <a href={activeRssItem.link} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-brand-600 hover:underline">
                     <ExternalLink size={14}/> 原文
                   </a>
                   <button 
                     onClick={() => handleClipRSSItem(activeRssItem)}
                     className="flex items-center gap-1 bg-brand-50 text-brand-700 px-3 py-1 rounded-full hover:bg-brand-100 transition-colors"
                   >
                     <Plus size={14}/> 剪藏到笔记
                   </button>
                </div>
                
                <div className="prose dark:prose-invert max-w-none">
                   {/* RSS content is usually HTML. We use a div with dangerouslySetInnerHTML 
                       For a production app, sanitize this with DOMPurify! */}
                   <div dangerouslySetInnerHTML={{ __html: activeRssItem.content }} />
                </div>
             </div>
           ) : (
             <div className="flex flex-col items-center justify-center h-full text-gray-400">
               <BookOpen size={48} className="mb-4 opacity-20"/>
               <p>选择一篇文章开始阅读</p>
             </div>
           )}
        </div>
      </div>
    );
  };

  const renderGraphView = () => (
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

  const renderHistoryModal = () => {
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
               {/* List */}
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
               
               {/* Preview */}
               <div className="flex-1 p-6 overflow-y-auto bg-white dark:bg-dark-bg">
                  <div className="prose dark:prose-invert max-w-none">
                     <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 text-sm rounded border border-yellow-200 dark:border-yellow-900/50">
                        提示: 点击左侧列表中的“恢复此版本”按钮可回滚到该状态。
                     </div>
                     <h2 className="text-gray-400 border-b pb-2 mb-4">当前最新内容</h2>
                     <ReactMarkdown>{activeNote.content}</ReactMarkdown>
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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700 flex flex-col max-h-[90vh]">
           <div className="p-5 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-slate-800/50">
             <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">
               <Settings size={20} className="text-brand-600" /> 系统设置
             </h3>
             <button onClick={() => setSettingsOpen(false)} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">✕</button>
           </div>
           
           <div className="flex border-b border-gray-200 dark:border-gray-800">
              <button onClick={() => setSettingsTab('general')} className={`flex-1 py-3 text-sm font-medium ${settingsTab === 'general' ? 'text-brand-600 border-b-2 border-brand-600' : 'text-gray-500 hover:text-gray-700'}`}>常规 & AI</button>
              <button onClick={() => setSettingsTab('prompts')} className={`flex-1 py-3 text-sm font-medium ${settingsTab === 'prompts' ? 'text-brand-600 border-b-2 border-brand-600' : 'text-gray-500 hover:text-gray-700'}`}>提示词管理</button>
              <button onClick={() => setSettingsTab('data')} className={`flex-1 py-3 text-sm font-medium ${settingsTab === 'data' ? 'text-brand-600 border-b-2 border-brand-600' : 'text-gray-500 hover:text-gray-700'}`}>数据备份</button>
           </div>

           <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
             
             {settingsTab === 'general' && (
               <div className="space-y-6">
                  {/* Section: User */}
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-gray-900 dark:text-gray-100">用户名称</label>
                    <input 
                      className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
                      value={settings.userName}
                      onChange={(e) => setSettings({ ...settings, userName: e.target.value })}
                    />
                  </div>

                  <div className="border-t border-gray-100 dark:border-gray-700"></div>

                  {/* Section: AI Configuration */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                      AI 模型配置
                    </h4>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5">服务提供商</label>
                      <div className="relative">
                        <select 
                          className="w-full appearance-none p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
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
                        <ChevronDown className="absolute right-3 top-3 text-gray-400 pointer-events-none" size={16} />
                      </div>
                    </div>

                    <div className="grid gap-4 p-4 bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1.5">
                          API Key <span className="text-red-500">*</span>
                        </label>
                        <input 
                          type="password"
                          className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-slate-900 dark:text-white font-mono text-sm focus:border-brand-500 outline-none"
                          value={settings.aiConfig.apiKey}
                          onChange={(e) => setSettings({ ...settings, aiConfig: { ...settings.aiConfig, apiKey: e.target.value } })}
                          placeholder="sk-..."
                        />
                      </div>

                      {settings.aiConfig.provider !== 'google' && (
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1.5">Base URL</label>
                          <input 
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-slate-900 dark:text-white font-mono text-sm focus:border-brand-500 outline-none"
                            value={settings.aiConfig.baseUrl}
                            onChange={(e) => setSettings({ ...settings, aiConfig: { ...settings.aiConfig, baseUrl: e.target.value } })}
                            placeholder="https://api.example.com/v1"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1.5">模型名称</label>
                        <input 
                          className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-slate-900 dark:text-white font-mono text-sm focus:border-brand-500 outline-none"
                          value={settings.aiConfig.modelName}
                          onChange={(e) => setSettings({ ...settings, aiConfig: { ...settings.aiConfig, modelName: e.target.value } })}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 block">启用语义搜索</span>
                        <span className="text-xs text-gray-500">使用 Embedding 向量增强搜索结果</span>
                      </div>
                      <button 
                          onClick={() => setSettings({ ...settings, useSemanticSearch: !settings.useSemanticSearch })}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${settings.useSemanticSearch ? 'bg-brand-600' : 'bg-gray-200 dark:bg-gray-700'}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.useSemanticSearch ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>
                  </div>
               </div>
             )}

             {settingsTab === 'prompts' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">自定义 AI 指令</h4>
                    <button 
                      onClick={() => {
                        const newId = Date.now().toString();
                        const newTemplate = { id: newId, name: '新指令', template: '{{content}}', description: '自定义' };
                        setTemplates([...templates, newTemplate]);
                        StorageService.saveTemplate(newTemplate);
                      }}
                      className="text-xs bg-brand-50 text-brand-600 px-2 py-1 rounded hover:bg-brand-100"
                    >
                      + 添加指令
                    </button>
                  </div>
                  <div className="space-y-3">
                     {templates.map((t, idx) => (
                       <div key={t.id} className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-slate-800/30">
                          <div className="flex gap-2 mb-2">
                            <input 
                              className="flex-1 p-1 text-sm font-bold bg-white dark:bg-slate-800 border rounded border-gray-300 dark:border-gray-600"
                              value={t.name}
                              onChange={(e) => {
                                const newT = { ...t, name: e.target.value };
                                const list = [...templates]; list[idx] = newT;
                                setTemplates(list);
                              }}
                            />
                            <button onClick={async () => {
                               const list = templates.filter(item => item.id !== t.id);
                               setTemplates(list);
                            }} className="text-red-500 p-1 hover:bg-red-50 rounded"><Trash2 size={14}/></button>
                          </div>
                          <textarea 
                             className="w-full p-2 text-xs font-mono bg-white dark:bg-slate-800 border rounded border-gray-300 dark:border-gray-600"
                             rows={3}
                             value={t.template}
                             onChange={(e) => {
                                const newT = { ...t, template: e.target.value };
                                const list = [...templates]; list[idx] = newT;
                                setTemplates(list);
                              }}
                          />
                          <div className="text-[10px] text-gray-400 mt-1">使用 {"{{content}}"} 作为当前笔记内容的占位符。</div>
                       </div>
                     ))}
                     <button onClick={() => {
                        templates.forEach(t => StorageService.saveTemplate(t));
                        alert("模板已保存");
                     }} className="w-full py-2 bg-brand-600 text-white rounded text-sm mt-2">保存所有模板更改</button>
                  </div>
                </div>
             )}

             {settingsTab === 'data' && (
                <div className="space-y-6">
                   <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <h4 className="text-sm font-bold text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2"><Download size={16}/> 数据导出 (备份)</h4>
                      <p className="text-xs text-blue-600 dark:text-blue-400 mb-3">将所有笔记、设置和模板导出为 JSON 文件。建议定期备份。</p>
                      <button onClick={handleExportData} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors">导出数据</button>
                   </div>
                   
                   <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                      <h4 className="text-sm font-bold text-orange-800 dark:text-orange-300 mb-2 flex items-center gap-2"><Upload size={16}/> 数据导入 (恢复)</h4>
                      <p className="text-xs text-orange-600 dark:text-orange-400 mb-3">从 JSON 备份文件中恢复数据。注意：这将合并或覆盖现有数据。</p>
                      <label className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded text-sm transition-colors cursor-pointer inline-block">
                        选择备份文件
                        <input type="file" className="hidden" accept=".json" onChange={handleImportData} />
                      </label>
                   </div>
                </div>
             )}

           </div>

           <div className="p-4 bg-gray-50 dark:bg-slate-800 flex justify-end border-t border-gray-200 dark:border-gray-700 shrink-0">
             <button 
               onClick={async () => {
                 await StorageService.saveSettings(settings);
                 setSettingsOpen(false);
               }}
               className="bg-brand-600 hover:bg-brand-700 text-white px-6 py-2 rounded-lg font-medium text-sm transition-colors shadow-sm flex items-center gap-2"
             >
               <Check size={16} /> 保存并关闭
             </button>
           </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex w-full h-screen font-sans text-slate-900 dark:text-slate-200 bg-white dark:bg-dark-bg selection:bg-brand-100 dark:selection:bg-brand-900 overflow-hidden">
      {renderSidebar()}
      {appMode === 'reader' 
        ? renderRSSReader() 
        : (viewMode === 'graph' ? renderGraphView() : renderEditor())
      }
      {renderSettingsModal()}
      {renderHistoryModal()}
    </div>
  );
};

export default App;
