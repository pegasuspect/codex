declare const process: {
  argv: string[];
  env: Record<string, string | undefined>;
  exitCode?: number;
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
  export function appendFileSync(path: string, data: string): void;
}
declare module "node:os" {
  export function homedir(): string;
}
declare module "node:path" {
  export function dirname(path: string): string;
  export function join(...parts: string[]): string;
}
declare module "node:child_process" {
  export function spawnSync(
    command: string,
    args?: string[],
    options?: { stdio?: "ignore" },
  ): { status: number | null; error?: unknown };
}
