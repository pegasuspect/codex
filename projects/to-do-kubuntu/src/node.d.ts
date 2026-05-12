declare const process: {
  argv: string[];
  execPath: string;
  env: Record<string, string | undefined>;
  exitCode?: number;
  pid: number;
  exit(code?: number): never;
  getuid?: () => number;
  kill(pid: number, signal?: 0 | "SIGINT" | "SIGTERM"): boolean;
  on(event: "SIGINT" | "SIGTERM", listener: () => void): void;
  stdout: {
    write(text: string): void;
    columns?: number;
  };
  stderr: {
    write(text: string): void;
  };
  stdin: {
    isTTY?: boolean;
    setRawMode?(enabled: boolean): void;
  };
};

declare module "node:fs" {
  export function existsSync(path: string): boolean;
  export function mkdirSync(path: string, options?: { recursive?: boolean }): void;
  export function readFileSync(path: string, encoding: "utf8"): string;
  export function writeFileSync(path: string, data: string): void;
  export function appendFileSync(path: string, data: string): void;
  export function unlinkSync(path: string): void;
}
declare module "node:os" {
  export function homedir(): string;
}
declare module "node:path" {
  export function dirname(path: string): string;
  export function join(...parts: string[]): string;
}
declare module "node:child_process" {
  export function spawn(
    command: string,
    args?: string[],
    options?: { stdio?: "inherit" },
  ): {
    kill(signal?: "SIGINT" | "SIGTERM"): boolean;
    on(event: "error", listener: (error: unknown) => void): void;
    on(event: "exit", listener: (code: number | null, signal: string | null) => void): void;
  };
  export function spawnSync(
    command: string,
    args?: string[],
    options?: { stdio?: "inherit" },
  ): { status: number | null; error?: unknown };
  export function spawnSync(
    command: string,
    args?: string[],
    options?: { stdio?: "ignore" },
  ): { status: number | null; error?: unknown };
}
