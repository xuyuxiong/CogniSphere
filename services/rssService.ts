
import { RSSFeed, RSSItem } from '../types';

// Using rss2json service to bypass CORS and parse XML to JSON
// Note: This public API has some rate limits, but works well for personal use demos.
const RSS_TO_JSON_API = 'https://api.rss2json.com/v1/api.json?rss_url=';

export const DEFAULT_FEEDS: RSSFeed[] = [
  { 
    title: 'Hacker News (Best)', 
    url: 'https://hnrss.org/best', 
    description: 'Tech news and discussion.',
    category: 'Tech'
  },
  { 
    title: 'Smashing Magazine', 
    url: 'https://www.smashingmagazine.com/feed/', 
    description: 'For Web Designers and Developers.',
    category: 'Frontend'
  },
  { 
    title: 'Paul Graham Essays', 
    url: 'http://www.aaronsw.com/2002/feeds/pgessays.rss', 
    description: 'Essays by Paul Graham.',
    category: 'Thought'
  },
  {
    title: 'React Blog',
    url: 'https://react.dev/feed.xml',
    description: 'Official React News.',
    category: 'Frontend'
  }
];

export const RSSService = {
  async fetchFeed(feedUrl: string): Promise<{ feed: RSSFeed; items: RSSItem[] }> {
    try {
      const response = await fetch(`${RSS_TO_JSON_API}${encodeURIComponent(feedUrl)}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const data = await response.json();
      
      if (data.status !== 'ok') {
        throw new Error(data.message || 'RSS parsing failed');
      }

      const feed: RSSFeed = {
        url: feedUrl,
        title: data.feed.title,
        description: data.feed.description,
        image: data.feed.image
      };

      const items: RSSItem[] = data.items.map((item: any) => ({
        title: item.title,
        pubDate: item.pubDate,
        link: item.link,
        guid: item.guid,
        author: item.author,
        thumbnail: item.thumbnail,
        description: item.description, // Often summary
        content: item.content || item.description, // Full content if available
        feedTitle: feed.title
      }));

      return { feed, items };
    } catch (error) {
      console.error("RSS Fetch Error:", error);
      throw error;
    }
  }
};
