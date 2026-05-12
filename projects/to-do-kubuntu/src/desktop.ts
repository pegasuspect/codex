import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import type { Task } from "./model";

const cacheHome = () =>
  process.env.XDG_CACHE_HOME ?? join(homedir(), ".cache");

const statusIconPath = () =>
  join(cacheHome(), "to-do-kubuntu", "status-icon.svg");

const escapeXml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const writeStatusIcon = (count: number): string => {
  const path = statusIconPath();
  const label = count > 99 ? "99+" : String(Math.max(0, count));
  const fontSize = label.length > 2 ? 22 : label.length > 1 ? 28 : 34;

  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(
    path,
    [
      '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">',
      '  <rect width="64" height="64" rx="12" fill="#2563eb"/>',
      '  <path d="M17 32.5 27 42l20-22" fill="none" stroke="#ffffff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" opacity=".35"/>',
      `  <circle cx="43" cy="21" r="18" fill="${count > 0 ? "#dc2626" : "#16a34a"}" stroke="#ffffff" stroke-width="4"/>`,
      `  <text x="43" y="22.5" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="700" fill="#ffffff">${escapeXml(label)}</text>`,
      "</svg>",
      "",
    ].join("\n"),
  );

  return path;
};

const notify = (summary: string, body: string, icon = "view-task") => {
  spawnSync("notify-send", ["--app-name=todoctl", `--icon=${icon}`, summary, body], {
    stdio: "ignore",
  });
};

export const notifyDone = (tasks: Task[]) => {
  for (const task of tasks) notify("To-Do Kubuntu", `Done: ${task.title}`);
};

export const notifyStatus = (count: number) => {
  const label = count === 1 ? "incomplete todo" : "incomplete todos";
  const icon = writeStatusIcon(count);
  notify("To-Do Kubuntu", `${count} ${label}`, icon);
  return `status icon sent: ${count} ${label}`;
};
