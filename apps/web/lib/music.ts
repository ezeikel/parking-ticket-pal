const { R2_PUBLIC_URL } = process.env;

// ---------------------------------------------------------------------------
// Background music — curated from Epidemic Sound, stored in R2
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Sound effects — curated from Epidemic Sound, stored in R2
// Upload files to: social/sfx/{category}/{name}-0N.mp3
//
// What to source from Epidemic Sound:
//   transition/  — 3x short whoosh/page-turn/swipe sounds (~1s each)
//   news-alert/  — 3x bright digital chime + subtle braam sting (~2s each)
//   gavel-allowed/ — 3x gavel tap + positive resolution chime (~2s each)
//   gavel-refused/ — 3x gavel tap + solemn low note (~2s each)
// ---------------------------------------------------------------------------

type SfxCategory =
  | 'transition'
  | 'news-alert'
  | 'gavel-allowed'
  | 'gavel-refused';

const SFX_TRACKS: Record<SfxCategory, string[]> = {
  transition: [
    `${R2_PUBLIC_URL}/social/sfx/transition/transition-01.mp3`,
    `${R2_PUBLIC_URL}/social/sfx/transition/transition-02.mp3`,
    `${R2_PUBLIC_URL}/social/sfx/transition/transition-03.mp3`,
  ],
  'news-alert': [
    `${R2_PUBLIC_URL}/social/sfx/news-alert/news-alert-01.mp3`,
    `${R2_PUBLIC_URL}/social/sfx/news-alert/news-alert-02.mp3`,
    `${R2_PUBLIC_URL}/social/sfx/news-alert/news-alert-03.mp3`,
  ],
  'gavel-allowed': [
    `${R2_PUBLIC_URL}/social/sfx/gavel-allowed/gavel-allowed-01.mp3`,
    `${R2_PUBLIC_URL}/social/sfx/gavel-allowed/gavel-allowed-02.mp3`,
    `${R2_PUBLIC_URL}/social/sfx/gavel-allowed/gavel-allowed-03.mp3`,
  ],
  'gavel-refused': [
    `${R2_PUBLIC_URL}/social/sfx/gavel-refused/gavel-refused-01.mp3`,
    `${R2_PUBLIC_URL}/social/sfx/gavel-refused/gavel-refused-02.mp3`,
    `${R2_PUBLIC_URL}/social/sfx/gavel-refused/gavel-refused-03.mp3`,
  ],
};

export function getRandomSfx(category: SfxCategory): string {
  const tracks = SFX_TRACKS[category];
  return tracks[Math.floor(Math.random() * tracks.length)];
}
