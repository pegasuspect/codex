import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import type { Event } from "./model";

const dataHome = () =>
  process.env.XDG_DATA_HOME ?? join(homedir(), ".local", "share");

export const eventLogPath = () =>
  process.env.TODOCTL_EVENT_LOG ?? join(dataHome(), "to-do-kubuntu", "events.jsonl");

export const loadEvents = (): Event[] => {
  const path = eventLogPath();
  if (!existsSync(path)) return [];

  return readFileSync(path, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Event);
};

export const saveEvent = (event: Event): void => {
  const path = eventLogPath();
  mkdirSync(dirname(path), { recursive: true });
  appendFileSync(path, `${JSON.stringify(event)}\n`);
};
