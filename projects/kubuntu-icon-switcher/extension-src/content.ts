interface ArtworkCandidate {
  artworkUrl: string;
  title?: string;
}

interface RankedArtworkCandidate extends ArtworkCandidate {
  score: number;
}

let lastArtworkUrl: string | null = null;
let lastIsPlaying: boolean | null = null;
let pendingTimer: number | null = null;

const observer = new MutationObserver(() => {
  scheduleEmit();
});

observer.observe(document.documentElement, {
  attributes: true,
  childList: true,
  subtree: true,
});

scheduleEmit();
window.setInterval(scheduleEmit, 5_000);
window.addEventListener('pagehide', () => {
  emitInactiveState();
});
window.addEventListener('beforeunload', () => {
  emitInactiveState();
});

function scheduleEmit(): void {
  if (pendingTimer !== null) {
    return;
  }

  pendingTimer = window.setTimeout(() => {
    pendingTimer = null;
    emitCurrentArtwork();
  }, 250);
}

function emitCurrentArtwork(): void {
  const candidate = findArtworkCandidate();
  const isPlaying = isSpotifyPlaying();

  if (!candidate && !isPlaying) {
    emitInactiveState();
    return;
  }

  if (candidate?.artworkUrl === lastArtworkUrl && isPlaying === lastIsPlaying) {
    return;
  }

  lastArtworkUrl = candidate?.artworkUrl ?? lastArtworkUrl;
  lastIsPlaying = isPlaying;
  void browser.runtime.sendMessage({
    artworkUrl: candidate?.artworkUrl,
    isPlaying,
    pageUrl: window.location.href,
    source: 'spotify-web',
    title: candidate?.title,
  });
}

function emitInactiveState(): void {
  if (lastIsPlaying === false) {
    return;
  }

  lastIsPlaying = false;
  void browser.runtime.sendMessage({
    artworkUrl: lastArtworkUrl ?? undefined,
    isPlaying: false,
    pageUrl: window.location.href,
    source: 'spotify-web',
  });
}

function findArtworkCandidate(): ArtworkCandidate | null {
  const image = [...document.querySelectorAll<HTMLImageElement>('img')]
    .map(toRankedArtworkCandidate)
    .filter((candidate): candidate is RankedArtworkCandidate => candidate !== null)
    .sort((left, right) => right.score - left.score)
    .at(0);

  if (image) {
    return {
      artworkUrl: image.artworkUrl,
      title: image.title,
    };
  }

  const metaImage = document.querySelector<HTMLMetaElement>('meta[property="og:image"]');
  const metaTitle = document.querySelector<HTMLMetaElement>('meta[property="og:title"]');

  if (metaImage?.content) {
    return {
      artworkUrl: absolutize(metaImage.content),
      title: metaTitle?.content,
    };
  }

  return null;
}

function isSpotifyArtwork(url: string): boolean {
  return url.includes('i.scdn.co/image/') || url.includes('mosaic.scdn.co/');
}

function toRankedArtworkCandidate(image: HTMLImageElement): RankedArtworkCandidate | null {
  const artworkUrl = image.currentSrc || image.src;

  if (!isSpotifyArtwork(artworkUrl) || !isVisible(image)) {
    return null;
  }

  return {
    artworkUrl: absolutize(artworkUrl),
    score: scoreArtworkImage(image),
    title: image.alt || undefined,
  };
}

function scoreArtworkImage(image: HTMLImageElement): number {
  const box = image.getBoundingClientRect();
  const centerY = box.top + box.height / 2;
  const lowerScreenBias = centerY / Math.max(window.innerHeight, 1);
  const playerRegionBonus = isInsidePlayerRegion(image) ? 10_000 : 0;
  const usableSize = Math.min(box.width * box.height, 80_000);

  return playerRegionBonus + lowerScreenBias * 1_000 + usableSize;
}

function isInsidePlayerRegion(image: HTMLImageElement): boolean {
  const box = image.getBoundingClientRect();

  if (box.bottom > window.innerHeight - 160) {
    return true;
  }

  return Boolean(
    image.closest(
      [
        '[data-testid="now-playing-widget"]',
        '[data-testid="now-playing-bar"]',
        '[data-testid="cover-art-image"]',
        '[aria-label*="Now playing"]',
      ].join(','),
    ),
  );
}

function isVisible(image: HTMLImageElement): boolean {
  const box = image.getBoundingClientRect();

  return (
    box.width >= 24 &&
    box.height >= 24 &&
    box.bottom > 0 &&
    box.right > 0 &&
    box.top < window.innerHeight &&
    box.left < window.innerWidth
  );
}

function isSpotifyPlaying(): boolean {
  const playPauseButton = document.querySelector<HTMLElement>(
    [
      '[data-testid="control-button-playpause"]',
      'button[aria-label="Pause"]',
      'button[aria-label*="Pause"]',
    ].join(','),
  );
  const label = playPauseButton?.getAttribute('aria-label') ?? '';

  return label.toLowerCase().includes('pause');
}

function absolutize(url: string): string {
  return new URL(url, window.location.href).toString();
}
