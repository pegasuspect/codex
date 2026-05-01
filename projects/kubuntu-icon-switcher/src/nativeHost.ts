#!/usr/bin/env node
import { stdin } from 'node:process';
import { firefoxArtworkStatePath, writeFirefoxArtworkState } from './firefoxArtworkState.js';

let buffer = Buffer.alloc(0);

stdin.on('data', (chunk: Buffer) => {
  buffer = Buffer.concat([buffer, chunk]);
  void drainMessages();
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

  await writeFirefoxArtworkState(firefoxArtworkStatePath(process.env.HOME), parsed);
}

function isNativeArtworkMessage(value: unknown): value is {
  artworkUrl: string;
  emittedAt: string;
  pageUrl: string;
  source: 'spotify-web';
  title?: string;
} {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as {
    artworkUrl?: unknown;
    emittedAt?: unknown;
    pageUrl?: unknown;
    source?: unknown;
  };

  return (
    typeof candidate.artworkUrl === 'string' &&
    typeof candidate.emittedAt === 'string' &&
    typeof candidate.pageUrl === 'string' &&
    candidate.source === 'spotify-web'
  );
}
