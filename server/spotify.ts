export interface TrackInfo {
  name: string;
  artist: string;
  previewUrl: string;
}

const GENRE_QUERIES: Record<string, string[]> = {
  'chinese-pop': [
    '周杰伦', '林俊杰', '陈奕迅', '薛之谦', '邓紫棋',
    '毛不易', '李荣浩', '华晨宇', '张学友', '王力宏',
    '五月天', '蔡依林', '孙燕姿', '萧敬腾', '李宇春',
  ],
  'western-pop': [
    'Taylor Swift', 'Ed Sheeran', 'Adele', 'Bruno Mars', 'The Weeknd',
    'Dua Lipa', 'Justin Bieber', 'Billie Eilish', 'Ariana Grande', 'Harry Styles',
    'Coldplay', 'Maroon 5', 'Imagine Dragons', 'Lady Gaga', 'Post Malone',
  ],
  'kpop': [
    'BTS', 'BLACKPINK', 'IU', 'EXO', 'TWICE',
    'Stray Kids', 'aespa', 'NewJeans', 'Red Velvet', '(G)I-DLE',
    'SEVENTEEN', 'TXT', 'LE SSERAFIM', 'ITZY', 'NCT',
  ],
  'jpop': [
    'YOASOBI', '米津玄師', 'Ado', 'Official髭男dism', 'LiSA',
    '藤井風', 'back number', 'King Gnu', 'Mrs. GREEN APPLE', 'Aimer',
    'ONE OK ROCK', 'あいみょん', '優里', 'Vaundy', 'RADWIMPS',
  ],
  'classic-chinese': [
    '邓丽君', '张国荣', '罗大佑', '崔健', '刘德华',
    '王菲', '李宗盛', '周华健', '蔡琴', '齐秦',
    '童安格', '赵传', '伍佰', '张信哲', '任贤齐',
  ],
};

export async function getTracksFromPlaylist(genre: string, count: number): Promise<TrackInfo[]> {
  const queries = (GENRE_QUERIES[genre] || GENRE_QUERIES['chinese-pop'])
    .sort(() => Math.random() - 0.5);

  const results = await Promise.allSettled(
    queries.slice(0, 6).map(async (query) => {
      const resp = await fetch(
        `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=10`
      );
      const data = await resp.json();
      return ((data.data as any[]) || [])
        .filter((t) => t.preview)
        .map((t) => ({
          name: t.title as string,
          artist: t.artist.name as string,
          previewUrl: t.preview as string,
        }));
    })
  );

  const allTracks: TrackInfo[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled') allTracks.push(...r.value);
  }

  const seen = new Set<string>();
  const unique = allTracks.filter((t) => {
    if (seen.has(t.name)) return false;
    seen.add(t.name);
    return true;
  });

  return unique.sort(() => Math.random() - 0.5).slice(0, Math.max(count, 10));
}

export function generateOptions(correct: string, allTracks: TrackInfo[]): string[] {
  const others = allTracks
    .map((t) => t.name)
    .filter((n) => n !== correct)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);
  return [correct, ...others].sort(() => Math.random() - 0.5);
}
