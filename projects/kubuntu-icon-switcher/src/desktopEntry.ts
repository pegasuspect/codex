export function setDesktopEntryIcon(content: string, iconPath: string): string {
  const lines = content.split(/\r?\n/);
  const desktopEntryStart = lines.findIndex((line) => line.trim() === '[Desktop Entry]');

  if (desktopEntryStart === -1) {
    throw new Error('Desktop entry is missing a [Desktop Entry] section.');
  }

  const nextSection = lines.findIndex(
    (line, index) => index > desktopEntryStart && line.startsWith('[') && line.endsWith(']'),
  );
  const desktopEntryEnd = nextSection === -1 ? lines.length : nextSection;

  for (let index = desktopEntryStart + 1; index < desktopEntryEnd; index += 1) {
    if (lines[index]?.startsWith('Icon=')) {
      lines[index] = `Icon=${iconPath}`;
      return lines.join('\n');
    }
  }

  lines.splice(desktopEntryEnd, 0, `Icon=${iconPath}`);
  return lines.join('\n');
}

