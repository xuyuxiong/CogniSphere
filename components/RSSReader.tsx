
import React from 'react';
import { Rss, Loader2, BookOpen, ExternalLink, Plus } from 'lucide-react';
import { RSSFeed, RSSItem } from '../types';

interface RSSReaderProps {
  activeFeedUrl: string | null;
  rssFeeds: RSSFeed[];
  loadingFeed: boolean;
  feedItems: RSSItem[];
  activeRssItem: RSSItem | null;
  setActiveRssItem: (item: RSSItem | null) => void;
  handleClipRSSItem: (item: RSSItem) => void;
}

export const RSSReader: React.FC<RSSReaderProps> = ({
  activeFeedUrl, rssFeeds, loadingFeed, feedItems, activeRssItem, setActiveRssItem, handleClipRSSItem
}) => {
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
