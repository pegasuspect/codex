import { chmod, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

const EXTENSION_ID = 'kubuntu-icon-switcher@codex.local';
const NATIVE_HOST_NAME = 'codex_kubuntu_icon_switcher';

export interface InstallNativeManifestInput {
  homeDirectory?: string;
  projectDirectory: string;
}

export async function installNativeManifest(input: InstallNativeManifestInput): Promise<string> {
  if (!input.homeDirectory) {
    throw new Error('HOME is not set.');
  }

  const manifestPath = join(
    input.homeDirectory,
    '.mozilla',
    'native-messaging-hosts',
    `${NATIVE_HOST_NAME}.json`,
  );
  const hostPath = resolve(input.projectDirectory, 'dist', 'src', 'nativeHost.js');
  const manifest = {
    name: NATIVE_HOST_NAME,
    description: 'Kubuntu Icon Switcher artwork bridge',
    path: hostPath,
    type: 'stdio',
    allowed_extensions: [EXTENSION_ID],
  };

  await mkdir(dirname(manifestPath), { recursive: true });
  await chmod(hostPath, 0o755);
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return manifestPath;
}
