
import { Note, AppSettings, PromptTemplate, DEFAULT_PROMPTS, RSSFeed } from '../types';

const DB_NAME = 'CogniSphereDB';
const DB_VERSION = 2; // Upgraded version for RSS support

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      if (!db.objectStoreNames.contains('notes')) {
        const noteStore = db.createObjectStore('notes', { keyPath: 'id' });
        noteStore.createIndex('tags', 'tags', { unique: false, multiEntry: true });
        noteStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }

      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('templates')) {
        db.createObjectStore('templates', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('rss_feeds')) {
        db.createObjectStore('rss_feeds', { keyPath: 'url' });
      }
    };
  });
};

export const StorageService = {
  // --- Notes ---
  async saveNote(note: Note): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('notes', 'readwrite');
      const store = tx.objectStore('notes');
      store.put(note);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async getNotes(): Promise<Note[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('notes', 'readonly');
      const store = tx.objectStore('notes');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async deleteNote(id: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('notes', 'readwrite');
      const store = tx.objectStore('notes');
      store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  // --- Settings ---
  async getSettings(): Promise<AppSettings | null> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('settings', 'readonly');
      const request = tx.objectStore('settings').get('user_settings');
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  },

  async saveSettings(settings: AppSettings): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('settings', 'readwrite');
      // @ts-ignore
      tx.objectStore('settings').put({ ...settings, id: 'user_settings' });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  // --- Templates ---
  async getTemplates(): Promise<PromptTemplate[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('templates', 'readonly');
      const request = tx.objectStore('templates').getAll();
      request.onsuccess = () => {
        const templates = request.result;
        if (templates.length === 0) {
           resolve(DEFAULT_PROMPTS);
           DEFAULT_PROMPTS.forEach(t => StorageService.saveTemplate(t));
        } else {
          resolve(templates);
        }
      };
      request.onerror = () => reject(request.error);
    });
  },

  async saveTemplate(template: PromptTemplate): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('templates', 'readwrite');
      tx.objectStore('templates').put(template);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  // --- RSS Feeds ---
  async getRSSFeeds(): Promise<RSSFeed[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('rss_feeds', 'readonly');
      const request = tx.objectStore('rss_feeds').getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  },

  async saveRSSFeed(feed: RSSFeed): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('rss_feeds', 'readwrite');
      tx.objectStore('rss_feeds').put(feed);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async deleteRSSFeed(url: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('rss_feeds', 'readwrite');
      tx.objectStore('rss_feeds').delete(url);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
};
