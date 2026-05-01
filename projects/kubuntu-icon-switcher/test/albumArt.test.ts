import { describe, expect, it } from 'vitest';
import { plannedAlbumArtPath } from '../src/albumArt.js';

describe('plannedAlbumArtPath', () => {
  it('plans a local file album art cache path with the source extension', () => {
    expect(plannedAlbumArtPath('file:///tmp/current-cover.webp', '/tmp/cache')).toBe(
      '/tmp/cache/spotify-album-art.webp',
    );
  });

  it('plans an HTTP album art cache path with a URL extension', () => {
    expect(plannedAlbumArtPath('https://i.scdn.co/image/example.jpg', '/tmp/cache')).toBe(
      '/tmp/cache/spotify-album-art.jpg',
    );
  });

  it('defaults HTTP album art without an extension to jpg', () => {
    expect(plannedAlbumArtPath('https://i.scdn.co/image/example', '/tmp/cache')).toBe(
      '/tmp/cache/spotify-album-art.jpg',
    );
  });
});
