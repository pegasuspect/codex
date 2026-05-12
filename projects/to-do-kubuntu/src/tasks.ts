import type { Event, Outcome, Task, TaskState } from "./model";
import { notifyDone, notifyStatus } from "./desktop";
import { loadEvents, saveEvent } from "./store";

const terminal = new Set<TaskState>(["done", "removed"]);
const statesByEvent = {
  "task.started": "started",
  "task.held": "held",
  "task.done": "done",
  "task.dropped": "removed",
} as const;

const eventsByVerb = {
  start: "task.started",
  hold: "task.held",
  done: "task.done",
  drop: "task.dropped",
  purge: "task.purged",
} as const;

const now = () => new Date().toISOString();
const nextId = (events: Event[]) =>
  String(
    Math.max(
      0,
      ...events
        .filter((event) => event.type === "task.added")
        .map((event) => Number(event.id))
        .filter(Number.isInteger),
    ) + 1,
  );

export const fold = (events: Event[]): Task[] => {
  const tasks = new Map<string, Task>();

  for (const event of events) {
    const task = tasks.get(event.id);
    if (event.type === "task.added") {
      tasks.set(event.id, {
        id: event.id,
        title: event.title,
        tags: event.tags,
        state: "wanted",
        createdAt: event.at,
        updatedAt: event.at,
      });
      continue;
    }
    if (event.type === "task.purged") {
      tasks.delete(event.id);
      continue;
    }
    if (!task) continue;

    task.updatedAt = event.at;
    task.state = statesByEvent[event.type];
  }

  return [...tasks.values()].sort((left, right) => left.createdAt.localeCompare(right.createdAt));
};

export const visible = (tasks: Task[], all = false) =>
  all ? tasks : tasks.filter((task) => !terminal.has(task.state));

export const formatTasks = (tasks: Task[], all = false): string => {
  const rows = visible(tasks, all);
  if (!rows.length) return "No tasks.";

  const width = Math.max(...rows.map((task) => task.id.length), 2);
  return rows
    .map((task) => {
      const tags = task.tags.length ? ` #${task.tags.join(" #")}` : "";
      return `${task.id.padEnd(width)}  ${task.state.padEnd(9)}  ${task.title}${tags}`;
    })
    .join("\n");
};

const eventFor = (verb: string, id: string): Event | undefined => {
  const type = eventsByVerb[verb as keyof typeof eventsByVerb];
  return type ? { type, id, at: now() } : undefined;
};

const targetsFrom = (args: string[]) =>
  args
    .join(" ")
    .split(",")
    .map((target) => target.trim())
    .filter(Boolean);

const resolveTask = (tasks: Task[], query: string): Outcome | Task => {
  const byId = tasks.find((task) => task.id === query);
  if (byId) return byId;
  if (/^\d+$/.test(query)) return { code: 1, text: `todoctl: no task numbered ${query}` };

  const wanted = query.toLowerCase();
  const matches = tasks.filter((task) => task.title.toLowerCase().startsWith(wanted));

  if (matches.length === 1) return matches[0];
  if (matches.length > 1) {
    return { code: 1, text: `todoctl: "${query}" matches ${matches.map((task) => task.id).join(", ")}` };
  }
  return { code: 1, text: `todoctl: no task named ${query}` };
};

const parseAdd = (args: string[]) => {
  const tags: string[] = [];
  const title: string[] = [];

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if ((arg === "--tag" || arg === "-t") && args[index + 1]) {
      tags.push(args[index + 1]);
      index += 1;
    } else {
      title.push(arg);
    }
  }

  return { title: title.join(" ").trim(), tags };
};

export const runTaskCommand = (args: string[]): Outcome => {
  const [verb = "help", ...rest] = args;
  const events = loadEvents();
  const tasks = fold(events);

  if (verb === "help" || verb === "--help" || verb === "-h") return { code: 0, text: help };
  if (verb === "list" || verb === "ls") {
    return { code: 0, text: formatTasks(tasks, rest.includes("--all") || rest.includes("-a")) };
  }
  if (verb === "status-icon") return { code: 0, text: notifyStatus(visible(tasks).length) };
  if (verb === "add") {
    const { title, tags } = parseAdd(rest);
    if (!title) return { code: 2, text: "usage: todoctl add <title> [--tag name]" };

    const at = now();
    const id = nextId(events);
    saveEvent({ type: "task.added", id, title, tags, at });
    return { code: 0, text: `added ${id}` };
  }

  const targets = targetsFrom(rest);
  if (!targets.length) return { code: 2, text: help };

  const resolved: Task[] = [];
  for (const target of targets) {
    const task = resolveTask(tasks, target);
    if ("code" in task) return task;
    resolved.push(task);
  }

  const eventsToSave: Event[] = [];
  for (const task of resolved) {
    const event = eventFor(verb, task.id);
    if (!event) return { code: 2, text: help };
    eventsToSave.push(event);
  }

  for (const event of eventsToSave) saveEvent(event);
  if (verb === "done") notifyDone(resolved.filter((task) => task.state !== "done"));

  return { code: 0, text: `${verb} ${resolved.map((task) => task.id).join(", ")}` };
};

export const help = [
  "todoctl <command>",
  "",
  "Commands:",
  "  add <title> [--tag name]  add a wanted task",
  "  list [--all]              list active tasks",
  "  start <targets>           mark tasks started",
  "  hold <targets>            hold tasks",
  "  done <targets>            finish tasks and notify on new completions",
  "  drop <targets>            remove tasks from active work",
  "  purge <targets>           delete task history projection",
  "  status-icon               notify the current incomplete count with an icon",
  "  --help                    show this help",
  "",
  "Targets can be numeric IDs or title prefixes. Numeric input only matches IDs.",
  "Use commas for multiple targets, for example: todoctl done 1,2,write",
].join("\n");
