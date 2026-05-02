#!/usr/bin/env node
import { stdin } from 'node:process';
import {
  type FirefoxArtworkState,
  firefoxArtworkStatePath,
  writeFirefoxArtworkState,
} from './firefoxArtworkState.js';

let buffer = Buffer.alloc(0);
let lastState: FirefoxArtworkState | null = null;

stdin.on('data', (chunk: Buffer) => {
  buffer = Buffer.concat([buffer, chunk]);
  void drainMessages();
});

stdin.on('end', () => {
  void writeInactiveState();
});

async function drainMessages(): Promise<void> {
  while (buffer.length >= 4) {
    const messageLength = buffer.readUInt32LE(0);

    if (buffer.length < messageLength + 4) {
      return;
    }

    const messageBuffer = buffer.subarray(4, messageLength + 4);
    buffer = buffer.subarray(messageLength + 4);

    await handleMessage(messageBuffer);
  }
}

async function handleMessage(messageBuffer: Buffer): Promise<void> {
  const parsed: unknown = JSON.parse(messageBuffer.toString('utf8'));

  if (!isNativeArtworkMessage(parsed)) {
    return;
  }

  lastState = parsed;
  await writeFirefoxArtworkState(firefoxArtworkStatePath(process.env.HOME), parsed);
}

async function writeInactiveState(): Promise<void> {
  if (!lastState) {
    return;
  }

  await writeFirefoxArtworkState(firefoxArtworkStatePath(process.env.HOME), {
    ...lastState,
    emittedAt: new Date().toISOString(),
    isPlaying: false,
  });
}

function isNativeArtworkMessage(value: unknown): value is FirefoxArtworkState {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as {
    artworkUrl?: unknown;
    emittedAt?: unknown;
    isPlaying?: unknown;
    pageUrl?: unknown;
    source?: unknown;
  };

  return (
    (candidate.artworkUrl === undefined || typeof candidate.artworkUrl === 'string') &&
    typeof candidate.emittedAt === 'string' &&
    typeof candidate.isPlaying === 'boolean' &&
    typeof candidate.pageUrl === 'string' &&
    candidate.source === 'spotify-web'
  );
}
