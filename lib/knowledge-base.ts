import fs from 'fs';
import path from 'path';

export interface Article {
  filename: string;
  title: string;
  content: string;
  url: string;
  snippet: string; // first ~600 chars of body
}

let cache: Article[] | null = null;

const STOPWORDS = new Set([
  'the','and','for','are','but','not','you','all','can','had','her','was','one',
  'our','out','day','get','has','him','his','how','its','who','did','let','put',
  'say','she','too','use','what','with','this','that','have','from','they','been',
  'will','your','when','were','more','also','into','than','then','them','some',
  'would','which','there','their','about','could','other','after','first','these',
]);

function loadArticles(): Article[] {
  if (cache) return cache;

  // Works both locally (../help-center-all) and when copied into knowledge-base/
  const candidates = [
    path.join(process.cwd(), '..', 'help-center-all'),
    path.join(process.cwd(), 'knowledge-base'),
  ];

  const dir = candidates.find((d) => fs.existsSync(d));
  if (!dir) {
    console.warn('[KB] No knowledge-base directory found');
    cache = [];
    return cache;
  }

  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md'));

  cache = files.map((filename) => {
    const raw = fs.readFileSync(path.join(dir, filename), 'utf-8');
    const lines = raw.split('\n');

    const title =
      lines.find((l) => l.startsWith('# '))?.replace(/^# /, '').trim() ||
      filename.replace(/-/g, ' ').replace('.md', '');

    const urlMatch = raw.match(/Source:\s*(https?:\/\/\S+)/);
    const url = urlMatch ? urlMatch[1].trim() : '';

    // Body = everything except the last Source: line
    const body = raw.replace(/\nSource:.*$/, '').trim();
    const snippet = body.slice(0, 600);

    return { filename, title, content: body, url, snippet };
  });

  return cache;
}

/** Return the top-N most relevant articles for a query using simple TF scoring */
export function findRelevantArticles(query: string, topN = 5): Article[] {
  const articles = loadArticles();
  if (!articles.length) return [];

  const words = query
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 3 && !STOPWORDS.has(w));

  if (!words.length) return articles.slice(0, topN);

  const scored = articles.map((article) => {
    const haystack =
      (article.filename + ' ' + article.title + ' ' + article.content).toLowerCase();
    let score = 0;
    for (const word of words) {
      // filename/title matches count double
      if (article.filename.includes(word) || article.title.toLowerCase().includes(word)) {
        score += 2;
      } else if (haystack.includes(word)) {
        score += 1;
      }
    }
    return { article, score };
  });

  return scored
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
    .map(({ article }) => article);
}
