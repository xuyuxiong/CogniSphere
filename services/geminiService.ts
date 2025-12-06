import { GoogleGenAI } from "@google/genai";
import { Note, AIModelConfig } from "../types";

// Cosine Similarity helper
const cosineSimilarity = (vecA: number[], vecB: number[]) => {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  const dotProduct = vecA.reduce((acc, val, i) => acc + val * vecB[i], 0);
  const magA = Math.sqrt(vecA.reduce((acc, val) => acc + val * val, 0));
  const magB = Math.sqrt(vecB.reduce((acc, val) => acc + val * val, 0));
  if (magA === 0 || magB === 0) return 0;
  return dotProduct / (magA * magB);
};

export const AIService = {
  // --- Google GenAI Implementation ---
  
  async _callGoogleGenAI(prompt: string, images: string[] | undefined, config: AIModelConfig): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: config.apiKey });
    
    // Construct parts
    const parts: any[] = [{ text: prompt }];
    
    if (images && images.length > 0) {
      images.forEach(img => {
        // img is expected to be a data URL "data:image/png;base64,..."
        const match = img.match(/^data:(.+);base64,(.+)$/);
        if (match) {
          parts.push({
            inlineData: {
              mimeType: match[1],
              data: match[2]
            }
          });
        }
      });
    }

    const response = await ai.models.generateContent({
      model: config.modelName || 'gemini-2.5-flash',
      contents: { parts },
    });
    return response.text || "未生成响应。";
  },

  async _embedGoogleGenAI(text: string, config: AIModelConfig): Promise<number[]> {
    const ai = new GoogleGenAI({ apiKey: config.apiKey });
    const response = await ai.models.embedContent({
      model: 'text-embedding-004',
      contents: { parts: [{ text }] },
    });
    // @ts-ignore
    return response.embeddings?.[0]?.values || [];
  },

  // --- OpenAI Compatible Implementation (DeepSeek, SiliconFlow, Qwen, etc.) ---

  async _callOpenAICompatible(prompt: string, images: string[] | undefined, config: AIModelConfig): Promise<string> {
    if (!config.baseUrl) throw new Error("该提供商需要 Base URL");
    
    const content: any[] = [{ type: 'text', text: prompt }];

    if (images && images.length > 0) {
      images.forEach(img => {
         content.push({
           type: 'image_url',
           image_url: { url: img }
         });
      });
    }

    const messages = [{ role: 'user', content: content }];

    // If no images, simplify content to just string for compatibility with some strict older APIs
    // But most multimodal OpenAI-compatible endpoints accept array content.
    const body: any = {
      model: config.modelName,
      messages: messages,
      temperature: 0.7
    };

    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`AI 请求失败: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "未生成响应。";
  },

  // --- Unified Public API ---

  async generateText(prompt: string, config: AIModelConfig, images?: string[]): Promise<string> {
    if (!config.apiKey) throw new Error("API Key 缺失");

    if (config.provider === 'google') {
      return AIService._callGoogleGenAI(prompt, images, config);
    } else {
      return AIService._callOpenAICompatible(prompt, images, config);
    }
  },

  async generateEmbedding(text: string, config: AIModelConfig): Promise<number[]> {
    if (!config.apiKey) throw new Error("API Key 缺失");

    if (config.provider === 'google') {
      return AIService._embedGoogleGenAI(text, config);
    } else {
       // Generic OpenAI compatible embedding
       if (!config.baseUrl) throw new Error("该提供商需要 Base URL");
       
       const response = await fetch(`${config.baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
          model: 'text-embedding-v2', // Heuristic default, user might need to change logic here for specific providers
          input: text
        })
      });

      if (!response.ok) {
         console.warn("Embedding endpoint failed or not supported for this provider.");
         return [];
      }
      
      const data = await response.json();
      return data.data?.[0]?.embedding || [];
    }
  },

  async semanticSearch(query: string, notes: Note[], config: AIModelConfig, topK = 5): Promise<Note[]> {
    if (!config.apiKey) return [];
    
    try {
      const queryVector = await AIService.generateEmbedding(query, config);
      
      if (queryVector.length === 0) return [];

      const scoredNotes = notes
        .filter(n => n.embedding && n.embedding.length > 0)
        .map(note => ({
          ...note,
          similarity: cosineSimilarity(queryVector, note.embedding!)
        }))
        .filter(n => n.similarity > 0.35) // Lower threshold slightly for broader context
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, topK);

      return scoredNotes;
    } catch (e) {
      console.error("语义搜索失败", e);
      return [];
    }
  },

  // --- RAG (Retrieval Augmented Generation) ---
  
  async generateRAGResponse(
    query: string, 
    notes: Note[], 
    config: AIModelConfig, 
    images?: string[]
  ): Promise<{ text: string, sources: Note[] }> {
    
    // 1. Retrieve relevant notes
    let relevantNotes: Note[] = [];
    try {
      // Use semantic search if possible
      relevantNotes = await AIService.semanticSearch(query, notes, config, 5);
      
      // Fallback to keyword search if semantic yields nothing or specific keywords are strong
      if (relevantNotes.length === 0) {
        const lowerQuery = query.toLowerCase();
        relevantNotes = notes.filter(n => 
          n.content.toLowerCase().includes(lowerQuery) || 
          n.title.toLowerCase().includes(lowerQuery)
        ).slice(0, 5);
      }
    } catch (e) {
      console.warn("Retrieval failed, proceeding without context", e);
    }

    // 2. Construct Prompt with Context
    let contextText = "";
    if (relevantNotes.length > 0) {
      contextText = relevantNotes.map(n => 
        `---
        Title: ${n.title}
        Tags: ${n.tags.join(', ')}
        Content: ${n.content.substring(0, 1500)}...
        ---`
      ).join('\n');
    }

    const systemPrompt = `你是一个名为 "CogniSphere" 的个人知识库助手。
请根据以下【参考上下文】（来源于用户的个人笔记）来回答用户的问题。
如果上下文中包含答案，请引用相关信息并回答。
如果上下文中没有相关信息，请利用你自己的通用知识回答，并明确告知用户知识库中没有相关记录。
回答应该专业、条理清晰，使用 Markdown 格式。

【参考上下文】：
${contextText || "（无相关笔记）"}

用户问题：${query}`;

    // 3. Generate Answer
    const responseText = await AIService.generateText(systemPrompt, config, images);

    return {
      text: responseText,
      sources: relevantNotes
    };
  }
};