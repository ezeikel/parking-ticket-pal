const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

const MUSIC_TRACKS: Record<string, string[]> = {
  news: [
    `${R2_PUBLIC_URL}/social/music/news/track-01.mp3`,
    `${R2_PUBLIC_URL}/social/music/news/track-02.mp3`,
    `${R2_PUBLIC_URL}/social/music/news/track-03.mp3`,
    `${R2_PUBLIC_URL}/social/music/news/track-04.mp3`,
    `${R2_PUBLIC_URL}/social/music/news/track-05.mp3`,
  ],
  tribunal: [
    `${R2_PUBLIC_URL}/social/music/tribunal/track-01.mp3`,
    `${R2_PUBLIC_URL}/social/music/tribunal/track-02.mp3`,
    `${R2_PUBLIC_URL}/social/music/tribunal/track-03.mp3`,
    `${R2_PUBLIC_URL}/social/music/tribunal/track-04.mp3`,
    `${R2_PUBLIC_URL}/social/music/tribunal/track-05.mp3`,
  ],
  blog: [
    `${R2_PUBLIC_URL}/social/music/blog/track-01.mp3`,
    `${R2_PUBLIC_URL}/social/music/blog/track-02.mp3`,
    `${R2_PUBLIC_URL}/social/music/blog/track-03.mp3`,
    `${R2_PUBLIC_URL}/social/music/blog/track-04.mp3`,
    `${R2_PUBLIC_URL}/social/music/blog/track-05.mp3`,
  ],
};

export function getRandomMusicTrack(
  category: 'news' | 'tribunal' | 'blog',
): string {
  const tracks = MUSIC_TRACKS[category];
  return tracks[Math.floor(Math.random() * tracks.length)];
}
