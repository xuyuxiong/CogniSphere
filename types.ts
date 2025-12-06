
export enum NoteType {
  MARKDOWN = 'MARKDOWN',
  CODE = 'CODE',
  JOURNAL = 'JOURNAL'
}

export interface NoteVersion {
  timestamp: number;
  content: string;
  summary?: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  folder: string; // New: Folder path (e.g., "Work/ProjectA")
  type: NoteType;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  versions: NoteVersion[];
  embedding?: number[]; // Vector for semantic search
  summary?: string;
  relatedIds?: string[]; // Manual or AI-suggested links
}

export interface PromptTemplate {
  id: string;
  name: string;
  template: string; // e.g., "Summarize this: {{content}}"
  description: string;
}

export interface SearchResult extends Note {
  score?: number; // Similarity score or search rank
  matchType?: 'keyword' | 'semantic';
}

export type AIProvider = 'google' | 'openai' | 'deepseek' | 'siliconflow' | 'custom';

export interface AIModelConfig {
  provider: AIProvider;
  apiKey: string;
  baseUrl?: string; // Optional for OpenAI compatible
  modelName: string; // e.g., 'gemini-2.5-flash' or 'deepseek-chat'
}

export interface AppSettings {
  aiConfig: AIModelConfig;
  theme: 'light' | 'dark';
  useSemanticSearch: boolean;
  userName: string;
}

export interface RSSFeed {
  url: string;
  title: string;
  description?: string;
  image?: string;
  category?: string;
}

export interface RSSItem {
  title: string;
  pubDate: string;
  link: string;
  guid: string;
  author: string;
  thumbnail?: string;
  description: string;
  content: string;
  feedTitle?: string; // Helper for display
}

// New Chat Interfaces
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  images?: string[]; // Base64 strings
  sources?: Note[]; // RAG citations
}

export const DEFAULT_PROMPTS: PromptTemplate[] = [
  {
    id: '1',
    name: '总结知识点',
    template: '你是一个知识管理助手。请总结以下内容，列出 3 个核心技术要点，使用 Markdown 格式：\n\n{{content}}',
    description: '生成简洁的摘要以便快速回顾。'
  },
  {
    id: '2',
    name: '生成问答对',
    template: '基于以下文本，生成 3 个面试风格的问答对，用于测试对材料的理解：\n\n{{content}}',
    description: '生成用于学习的卡片式问答。'
  },
  {
    id: '3',
    name: '提取待办事项',
    template: '分析以下笔记并提取可执行的任务或后续步骤列表，使用 Markdown Checkbox 格式：\n\n{{content}}',
    description: '从会议记录中解析任务。'
  },
  {
    id: '4',
    name: '优化润色',
    template: '请作为一名专业的技术编辑，优化以下文本的语法、流畅度和专业性，保持原意不变：\n\n{{content}}',
    description: '提升笔记的写作质量。'
  },
  {
    id: '5',
    name: '自动打标签',
    template: '阅读以下内容，推荐 5 个相关的标签（Tag），只返回标签，用逗号分隔，不要解释：\n\n{{content}}',
    description: '基于内容自动分类。'
  }
];