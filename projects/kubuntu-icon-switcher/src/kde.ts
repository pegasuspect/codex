import { spawn } from 'node:child_process';

export async function refreshKdeServiceCache(): Promise<string> {
  const commands = ['kbuildsycoca6', 'kbuildsycoca5'];

  for (const command of commands) {
    const result = await run(command, []);

    if (result.status === 'success') {
      return `Refreshed KDE service cache with ${command}.`;
    }
  }

  return 'No kbuildsycoca command found. You may need to log out and back in, or refresh Plasma manually.';
}

function run(command: string, args: string[]): Promise<{ status: 'success' | 'failed' }> {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: 'ignore' });

    child.on('error', () => {
      resolve({ status: 'failed' });
    });
    child.on('exit', (code) => {
      resolve({ status: code === 0 ? 'success' : 'failed' });
    });
  });
}
