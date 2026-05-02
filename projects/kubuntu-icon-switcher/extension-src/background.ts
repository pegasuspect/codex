interface ArtworkMessage {
  artworkUrl?: string;
  isPlaying: boolean;
  pageUrl: string;
  source: 'spotify-web';
  title?: string;
}

const NATIVE_HOST = 'codex_kubuntu_icon_switcher';

let port: browser.runtime.Port | null = null;

browser.runtime.onMessage.addListener((message: unknown) => {
  if (!isArtworkMessage(message)) {
    return;
  }

  const nativePort = getNativePort();
  nativePort.postMessage({
    artworkUrl: message.artworkUrl,
    emittedAt: new Date().toISOString(),
    isPlaying: message.isPlaying,
    pageUrl: message.pageUrl,
    source: message.source,
    title: message.title,
  });
});

function getNativePort(): browser.runtime.Port {
  if (port) {
    return port;
  }

  port = browser.runtime.connectNative(NATIVE_HOST);
  port.onDisconnect.addListener(() => {
    port = null;
  });

  return port;
}

function isArtworkMessage(value: unknown): value is ArtworkMessage {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<ArtworkMessage>;
  return (
    (candidate.artworkUrl === undefined || typeof candidate.artworkUrl === 'string') &&
    typeof candidate.isPlaying === 'boolean' &&
    typeof candidate.pageUrl === 'string' &&
    candidate.source === 'spotify-web'
  );
}
