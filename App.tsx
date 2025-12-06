
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { StorageService } from './services/storageService';
import { AIService } from './services/geminiService';
import { RSSService, DEFAULT_FEEDS } from './services/rssService';
import { Note, AppSettings, NoteType, AIProvider, PromptTemplate, NoteVersion, RSSFeed, RSSItem, ChatMessage } from './types';
import { generateId } from './utils';

// Import Modular Components
import { LeftPanel } from './components/LeftPanel';
import { NoteEditor } from './components/NoteEditor';
import { RSSReader } from './components/RSSReader';
import { ChatInterface } from './components/ChatInterface';
import { GraphView } from './components/GraphView';
import { SettingsModal } from './components/SettingsModal';
import { HistoryModal } from './components/HistoryModal';

const PROVIDERS: { id: AIProvider; name: string; defaultBaseUrl?: string; defaultModel: string }[] = [
  { id: 'google', name: 'Google Gemini', defaultModel: 'gemini-2.5-flash' },
  { id: 'deepseek', name: 'DeepSeek', defaultBaseUrl: 'https://api.deepseek.com', defaultModel: 'deepseek-chat' },
  { id: 'siliconflow', name: 'SiliconFlow (iFlow)', defaultBaseUrl: 'https://api.siliconflow.cn/v1', defaultModel: 'Qwen/Qwen2.5-7B-Instruct' },
  { id: 'custom', name: 'Custom (OpenAI Compatible)', defaultModel: 'gpt-3.5-turbo' }
];

const App: React.FC = () => {
  // --- State ---
  const [appMode, setAppMode] = useState<'notes' | 'reader' | 'chat'>('notes');
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

  // --- Chat State ---
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatImages, setChatImages] = useState<string[]>([]); // Base64 strings
  const [generatingChat, setGeneratingChat] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatImageInputRef = useRef<HTMLInputElement>(null);
  const importFileRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const previewScrollRef = useRef<HTMLDivElement>(null);

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

      const feeds = await StorageService.getRSSFeeds();
      if (feeds.length === 0) {
        setRssFeeds(DEFAULT_FEEDS);
        DEFAULT_FEEDS.forEach(f => StorageService.saveRSSFeed(f));
      } else {
        setRssFeeds(feeds);
      }
      
      // Init welcome message
      if (chatMessages.length === 0) {
          setChatMessages([{
            id: 'welcome',
            role: 'assistant',
            content: '你好！我是你的个人知识助手。我可以根据你的笔记回答问题，支持文字和图片交互。有什么可以帮你的吗？',
            timestamp: Date.now()
          }]);
      }
    };
    loadData();
  }, []);

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
        setActiveRssItem(null);
      } catch (e) {
        alert("无法加载该 RSS 源，请检查网络或源地址。");
      } finally {
        setLoadingFeed(false);
      }
    };
    fetchItems();
  }, [activeFeedUrl]);

  useEffect(() => {
     if (appMode === 'chat' && chatScrollRef.current) {
        chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
     }
  }, [chatMessages, appMode]);

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
    setAppMode('notes');
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

  // --- Editor Insert Helper ---
  const handleEditorInsert = (textToInsert: string, cursorOffset = 0) => {
    if (!activeNote || !editorRef.current) return;
    
    const textarea = editorRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    
    // Check if wrapping selected text
    const selectedText = text.substring(start, end);
    let newText = "";
    let newCursorPos = start + textToInsert.length + cursorOffset;

    if (selectedText.length > 0 && (textToInsert.startsWith('**') || textToInsert.startsWith('*') || textToInsert.startsWith('['))) {
       // Simple wrapping logic for basic formatting
       if (textToInsert === '**加粗文本**') newText = text.substring(0, start) + `**${selectedText}**` + text.substring(end);
       else if (textToInsert === '*斜体文本*') newText = text.substring(0, start) + `*${selectedText}*` + text.substring(end);
       else newText = text.substring(0, start) + textToInsert + text.substring(end);
       newCursorPos = start + textToInsert.length;
    } else {
       newText = text.substring(0, start) + textToInsert + text.substring(end);
    }
    
    handleUpdateNote(activeNote.id, { content: newText });
    
    // Focus back and set cursor
    setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  // --- Sync Scroll ---
  const handleEditorScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    const editor = e.target as HTMLTextAreaElement;
    const preview = previewScrollRef.current;
    if (editor && preview) {
      // Calculate percentage
      const percentage = editor.scrollTop / (editor.scrollHeight - editor.clientHeight);
      // Apply to preview
      preview.scrollTop = percentage * (preview.scrollHeight - preview.clientHeight);
    }
  };

  // --- RSS Handlers ---
  const handleAddRSS = async () => {
    const url = prompt("请输入 RSS Feed 地址：");
    if (!url) return;
    if (!url.startsWith('http')) return alert("请输入有效的 URL");

    try {
      setLoadingFeed(true);
      const { feed } = await RSSService.fetchFeed(url);
      
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

  // --- Chat Handlers ---
  const handleChatSubmit = async () => {
    if ((!chatInput.trim() && chatImages.length === 0) || generatingChat) return;
    if (!settings.aiConfig.apiKey) return alert("请先在设置中配置 API Key");

    const userMsg: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: chatInput,
      images: [...chatImages],
      timestamp: Date.now()
    };

    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setChatImages([]);
    setGeneratingChat(true);

    try {
      // Execute RAG
      const { text, sources } = await AIService.generateRAGResponse(
        userMsg.content,
        notes,
        settings.aiConfig,
        userMsg.images
      );

      const botMsg: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: text,
        timestamp: Date.now(),
        sources: sources
      };

      setChatMessages(prev => [...prev, botMsg]);
    } catch (e: any) {
      const errorMsg: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: `抱歉，遇到了一些问题：${e.message}`,
        timestamp: Date.now()
      };
      setChatMessages(prev => [...prev, errorMsg]);
    } finally {
      setGeneratingChat(false);
    }
  };

  const handleChatImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setChatImages(prev => [...prev, base64]);
    };
    reader.readAsDataURL(file);
    if (chatImageInputRef.current) chatImageInputRef.current.value = '';
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

  return (
    <div className="flex w-full h-screen font-sans text-slate-900 dark:text-slate-200 bg-white dark:bg-dark-bg selection:bg-brand-100 dark:selection:bg-brand-900 overflow-hidden">
      <LeftPanel 
        appMode={appMode} setAppMode={setAppMode}
        isDarkMode={isDarkMode} handleThemeToggle={handleThemeToggle}
        setSettingsOpen={setSettingsOpen}
        notes={notes} filteredNotes={filteredNotes}
        activeNoteId={activeNoteId} setActiveNoteId={setActiveNoteId}
        searchQuery={searchQuery} setSearchQuery={setSearchQuery}
        viewMode={viewMode} setViewMode={setViewMode}
        handleCreateNote={handleCreateNote}
        importFileRef={importFileRef} handleImportFileNote={handleImportFileNote}
        handleImportUrlNote={handleImportUrlNote} importing={importing}
        rssFeeds={rssFeeds} activeFeedUrl={activeFeedUrl}
        setActiveFeedUrl={setActiveFeedUrl}
        handleAddRSS={handleAddRSS} handleDeleteRSS={handleDeleteRSS}
      />
      
      {appMode === 'reader' && (
        <RSSReader 
          activeFeedUrl={activeFeedUrl} rssFeeds={rssFeeds}
          loadingFeed={loadingFeed} feedItems={feedItems}
          activeRssItem={activeRssItem} setActiveRssItem={setActiveRssItem}
          handleClipRSSItem={handleClipRSSItem}
        />
      )}
      
      {appMode === 'notes' && (
        viewMode === 'graph' ? (
          <GraphView 
            notes={notes} setActiveNoteId={setActiveNoteId} 
            setViewMode={setViewMode} setAppMode={setAppMode}
          />
        ) : (
          <NoteEditor 
            activeNote={activeNote} loadingAI={loadingAI} settings={settings} templates={templates}
            handleUpdateNote={handleUpdateNote} handleEditorInsert={handleEditorInsert}
            handleEditorScroll={handleEditorScroll} handleImageUpload={handleImageUpload}
            handleAIAction={handleAIAction} handleDeleteNote={handleDeleteNote}
            setHistoryModalOpen={setHistoryModalOpen} fileInputRef={fileInputRef}
            editorRef={editorRef} previewScrollRef={previewScrollRef}
            handleImportUrlNote={handleImportUrlNote} importFileRef={importFileRef}
          />
        )
      )}
      
      {appMode === 'chat' && (
        <ChatInterface 
          settings={settings} notes={notes}
          chatMessages={chatMessages} chatInput={chatInput} setChatInput={setChatInput}
          chatImages={chatImages} setChatImages={setChatImages}
          generatingChat={generatingChat} handleChatSubmit={handleChatSubmit}
          handleChatImageUpload={handleChatImageUpload}
          chatScrollRef={chatScrollRef} chatImageInputRef={chatImageInputRef}
          setAppMode={setAppMode} setActiveNoteId={setActiveNoteId} setViewMode={setViewMode}
        />
      )}
      
      <SettingsModal 
        settingsOpen={settingsOpen} setSettingsOpen={setSettingsOpen}
        settings={settings} setSettings={setSettings}
        settingsTab={settingsTab} setSettingsTab={setSettingsTab}
        templates={templates} setTemplates={setTemplates}
        handleExportData={handleExportData} handleImportData={handleImportData}
        PROVIDERS={PROVIDERS}
      />
      
      <HistoryModal 
        historyModalOpen={historyModalOpen} setHistoryModalOpen={setHistoryModalOpen}
        activeNote={activeNote} handleRestoreVersion={handleRestoreVersion}
      />
    </div>
  );
};

export default App;
