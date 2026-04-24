interface SpotifyToken {
  token: string;
  expiresAt: number;
}

let cachedToken: SpotifyToken | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Spotify credentials not configured');
  }

  const resp = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
  });

  const data = await resp.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
  return cachedToken.token;
}

export interface TrackInfo {
  name: string;
  artist: string;
  previewUrl: string;
}

const PLAYLIST_IDS: Record<string, string> = {
  'chinese-pop': '37i9dQZF1DX4dxJNMnMPOx',
  'us-pop': '37i9dQZF1DXcBWIGoYBM5M',
  'kpop': '37i9dQZF1DX9tPFwDMOaN1',
  'jpop': '37i9dQZF1DXdbRLJPSmnyq',
};

export async function getTracksFromPlaylist(genre: string, count: number): Promise<TrackInfo[]> {
  const token = await getAccessToken();
  const playlistId = PLAYLIST_IDS[genre] || PLAYLIST_IDS['chinese-pop'];

  const resp = await fetch(
    `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=50&fields=items(track(name,artists(name),preview_url))`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  const data = await resp.json();
  const tracks: TrackInfo[] = (data.items || [])
    .filter((item: any) => item.track?.preview_url)
    .map((item: any) => ({
      name: item.track.name,
      artist: item.track.artists[0]?.name || 'Unknown',
      previewUrl: item.track.preview_url,
    }));

  return tracks.sort(() => Math.random() - 0.5).slice(0, count);
}

export function generateOptions(correct: string, allTracks: TrackInfo[]): string[] {
  const others = allTracks.map((t) => t.name).filter((n) => n !== correct).sort(() => Math.random() - 0.5).slice(0, 3);
  return [correct, ...others].sort(() => Math.random() - 0.5);
}
