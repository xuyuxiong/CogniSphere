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
  
  async _callGoogleGenAI(prompt: string, config: AIModelConfig): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: config.apiKey });
    const response = await ai.models.generateContent({
      model: config.modelName || 'gemini-2.5-flash',
      contents: prompt,
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

  async _callOpenAICompatible(prompt: string, config: AIModelConfig): Promise<string> {
    if (!config.baseUrl) throw new Error("该提供商需要 Base URL");
    
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.modelName,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`AI 请求失败: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "未生成响应。";
  },

  // --- Unified Public API ---

  async generateText(prompt: string, config: AIModelConfig): Promise<string> {
    if (!config.apiKey) throw new Error("API Key 缺失");

    if (config.provider === 'google') {
      return AIService._callGoogleGenAI(prompt, config);
    } else {
      // DeepSeek, SiliconFlow, Custom, etc.
      return AIService._callOpenAICompatible(prompt, config);
    }
  },

  async generateEmbedding(text: string, config: AIModelConfig): Promise<number[]> {
    if (!config.apiKey) throw new Error("API Key 缺失");

    // Currently only Google supports convenient single-call embedding in this demo structure
    // or requires specific OpenAI compatible embedding endpoints.
    // For DeepSeek/SiliconFlow, we need to check if they support embedding or use a fallback.
    // DeepSeek V3 chat models don't embed, but they might have embedding endpoints.
    // SiliconFlow supports embeddings (e.g. bge-m3).
    
    if (config.provider === 'google') {
      return AIService._embedGoogleGenAI(text, config);
    } else {
       // Generic OpenAI compatible embedding
       if (!config.baseUrl) throw new Error("该提供商需要 Base URL");
       
       // Default fallback model for embedding if using generic provider, 
       // but ideally user configures this. We will try to use the configured model
       // or a standard one if the user is explicit. 
       // For this demo, we warn if not Google, as client-side RAG is complex with varying vector dimensions.
       
       // Trying a standard request:
       const response = await fetch(`${config.baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
          model: config.modelName, // Note: Chat models usually don't work here, need embedding model
          input: text
        })
      });

      if (!response.ok) {
         // Fallback or error
         console.warn("Embedding endpoint failed or not supported for this provider.");
         return [];
      }
      
      const data = await response.json();
      return data.data?.[0]?.embedding || [];
    }
  },

  async semanticSearch(query: string, notes: Note[], config: AIModelConfig): Promise<Note[]> {
    if (!config.apiKey) return [];
    
    try {
      const queryVector = await AIService.generateEmbedding(query, config);
      
      if (queryVector.length === 0) return [];

      const scoredNotes = notes
        .filter(n => n.embedding && n.embedding.length > 0)
        .map(note => ({
          ...note,
          // Note: Dimension mismatch check would be good here in production
          similarity: cosineSimilarity(queryVector, note.embedding!)
        }))
        .filter(n => n.similarity > 0.45) // Threshold
        .sort((a, b) => b.similarity - a.similarity);

      return scoredNotes;
    } catch (e) {
      console.error("语义搜索失败", e);
      return [];
    }
  }
};