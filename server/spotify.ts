export interface TrackInfo {
  name: string;
  artist: string;
  previewUrl: string;
}

const SEARCH_QUERIES = [
  '周杰伦', '林俊杰', '陈奕迅', '薛之谦', '邓紫棋',
  '毛不易', '李荣浩', '华晨宇', '张学友', '王力宏',
  '五月天', '蔡依林', '孙燕姿', '萧敬腾', '李宇春',
];

export async function getTracksFromPlaylist(_genre: string, count: number): Promise<TrackInfo[]> {
  const queries = SEARCH_QUERIES.sort(() => Math.random() - 0.5);

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
