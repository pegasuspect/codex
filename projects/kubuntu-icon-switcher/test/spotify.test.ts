import { describe, expect, it } from 'vitest';
import { parseMprisArtUrl } from '../src/spotify.js';

describe('parseMprisArtUrl', () => {
  it('extracts an MPRIS album art URL', () => {
    const output = 'mpris:artUrl: https://i.scdn.co/image/example';

    expect(parseMprisArtUrl(output)).toBe('https://i.scdn.co/image/example');
  });

  it('extracts an album art URL after the MPRIS key', () => {
    const output = [
      'dict entry(',
      '  string "mpris:artUrl"',
      '  variant string file:///tmp/art.png',
      ')',
    ].join('\n');

    expect(parseMprisArtUrl(output)).toBe('file:///tmp/art.png');
  });

  it('returns null when metadata has no album art', () => {
    expect(parseMprisArtUrl('xesam:title: Example')).toBeNull();
  });
});
