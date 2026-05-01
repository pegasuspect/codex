import { describe, expect, it } from 'vitest';
import { setDesktopEntryIcon } from '../src/desktopEntry.js';

describe('setDesktopEntryIcon', () => {
  it('replaces the icon in the desktop entry section', () => {
    const content = ['[Desktop Entry]', 'Name=Firefox', 'Icon=firefox', '', '[Desktop Action New]'].join(
      '\n',
    );

    expect(setDesktopEntryIcon(content, '/tmp/dog.png')).toBe(
      ['[Desktop Entry]', 'Name=Firefox', 'Icon=/tmp/dog.png', '', '[Desktop Action New]'].join(
        '\n',
      ),
    );
  });

  it('adds an icon when the desktop entry section has none', () => {
    const content = ['[Desktop Entry]', 'Name=Firefox', '', '[Desktop Action New]'].join('\n');

    expect(setDesktopEntryIcon(content, '/tmp/dog.png')).toBe(
      ['[Desktop Entry]', 'Name=Firefox', '', 'Icon=/tmp/dog.png', '[Desktop Action New]'].join(
        '\n',
      ),
    );
  });
});

