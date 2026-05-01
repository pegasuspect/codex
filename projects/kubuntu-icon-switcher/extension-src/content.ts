interface ArtworkCandidate {
  artworkUrl: string;
  title?: string;
}

let lastArtworkUrl: string | null = null;
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

  if (!candidate || candidate.artworkUrl === lastArtworkUrl) {
    return;
  }

  lastArtworkUrl = candidate.artworkUrl;
  void browser.runtime.sendMessage({
    artworkUrl: candidate.artworkUrl,
    pageUrl: window.location.href,
    source: 'spotify-web',
    title: candidate.title,
  });
}

function findArtworkCandidate(): ArtworkCandidate | null {
  const metaImage = document.querySelector<HTMLMetaElement>('meta[property="og:image"]');
  const metaTitle = document.querySelector<HTMLMetaElement>('meta[property="og:title"]');

  if (metaImage?.content) {
    return {
      artworkUrl: absolutize(metaImage.content),
      title: metaTitle?.content,
    };
  }

  const image = [...document.querySelectorAll<HTMLImageElement>('img')]
    .filter((candidate) => isSpotifyArtwork(candidate.currentSrc || candidate.src))
    .sort((left, right) => imageArea(right) - imageArea(left))
    .at(0);

  if (!image) {
    return null;
  }

  return {
    artworkUrl: absolutize(image.currentSrc || image.src),
    title: image.alt || undefined,
  };
}

function isSpotifyArtwork(url: string): boolean {
  return url.includes('i.scdn.co/image/') || url.includes('mosaic.scdn.co/');
}

function imageArea(image: HTMLImageElement): number {
  return image.naturalWidth * image.naturalHeight;
}

function absolutize(url: string): string {
  return new URL(url, window.location.href).toString();
}
