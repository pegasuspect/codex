import { spawnSync } from "node:child_process";
import type { Task } from "./model";

const notify = (summary: string, body: string) => {
  spawnSync("notify-send", ["--app-name=todoctl", "--icon=view-task", summary, body], {
    stdio: "ignore",
  });
};

export const notifyDone = (tasks: Task[]) => {
  for (const task of tasks) notify("To-Do Kubuntu", `Done: ${task.title}`);
};

export const notifyStatus = (count: number) => {
  const label = count === 1 ? "incomplete todo" : "incomplete todos";
  notify("To-Do Kubuntu", `${count} ${label}`);
  return `status icon sent: ${count} ${label}`;
};
