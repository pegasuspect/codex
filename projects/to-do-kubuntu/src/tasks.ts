import type { Event, Outcome, Task, TaskState } from "./model";
import { installStatusIcon, notifyDone, runStatusIcon, runStatusIconForeground, uninstallStatusIcon } from "./desktop";
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

export const commands = [
  { name: "add", usage: "add <title> [--tag name]", description: "add a wanted task" },
  { name: "list", usage: "list [--all]", description: "list active tasks" },
  { name: "ls", usage: "ls [--all]", description: "alias for list" },
  { name: "start", usage: "start <targets>", description: "mark tasks started" },
  { name: "hold", usage: "hold <targets> [--reason text]", description: "hold tasks" },
  { name: "done", usage: "done <targets>", description: "finish tasks and notify on new completions" },
  { name: "drop", usage: "drop <targets>", description: "remove tasks from active work" },
  { name: "purge", usage: "purge <targets>", description: "delete task history projection" },
  { name: "status", usage: "status [run|install|uninstall]", description: "manage the tray count icon" },
  { name: "completion", usage: "completion zsh", description: "print shell completion script" },
] as const;

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
    if (event.type === "task.held") {
      task.holdReason = event.reason;
    } else {
      delete task.holdReason;
    }
  }

  return [...tasks.values()].sort((left, right) => left.createdAt.localeCompare(right.createdAt));
};

export const visible = (tasks: Task[], all = false) =>
  all ? tasks : tasks.filter((task) => !terminal.has(task.state));

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const statusColor: Record<TaskState, string> = {
  wanted: "\u001b[34m",
  started: "\u001b[32m",
  held: "\u001b[33m",
  done: "\u001b[32m",
  removed: "\u001b[31m",
};

const resetColor = "\u001b[0m";

const statusLabel = (state: TaskState) => `${statusColor[state]}●${resetColor} ${capitalize(state)}`;

const ansiPattern = /\u001b\[[0-9;]*m/g;

const visibleLength = (value: string) => value.replace(ansiPattern, "").length;

const tableCell = (value: string) => value.replaceAll(/\s+/g, " ").trim();

const padCell = (value: string, width: number) => `${value}${" ".repeat(width - visibleLength(value))}`;

const border = (widths: number[]) => `+${widths.map((width) => "-".repeat(width + 2)).join("+")}+`;

const row = (values: string[], widths: number[]) =>
  `| ${values.map((value, index) => padCell(value, widths[index])).join(" | ")} |`;

const relativeTime = (timestamp: string) => {
  const elapsed = Math.max(0, Date.now() - new Date(timestamp).getTime());
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;

  if (elapsed < minute) return "now";
  if (elapsed < hour) return `${Math.floor(elapsed / minute)}m ago`;
  if (elapsed < day) return `${Math.floor(elapsed / hour)}h ago`;
  if (elapsed < week) return `${Math.floor(elapsed / day)}d ago`;
  return `${Math.floor(elapsed / week)}w ago`;
};

export const formatTasks = (tasks: Task[], all = false): string => {
  const rows = visible(tasks, all);
  if (!rows.length) return "No tasks.";

  const includeReason = rows.some((task) => task.state === "held");
  const headers = includeReason ? ["ID", "Status", "Updated", "Todo", "Reason"] : ["ID", "Status", "Updated", "Todo"];
  const values = rows.map((task) => {
    const tags = task.tags.length ? ` #${task.tags.join(" #")}` : "";
    const cells = [task.id, statusLabel(task.state), relativeTime(task.updatedAt), tableCell(`${task.title}${tags}`)];
    if (includeReason) cells.push(task.state === "held" ? tableCell(task.holdReason ?? "") : "");
    return cells;
  });
  const widths = headers.map((header, index) =>
    Math.max(visibleLength(header), ...values.map((cells) => visibleLength(cells[index]))),
  );
  const line = border(widths);

  return [
    line,
    row(headers, widths),
    line,
    ...values.map((cells) => row(cells, widths)),
    line,
  ].join("\n");
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

const parseHold = (args: string[]) => {
  const targets: string[] = [];
  const reason: string[] = [];
  let readingReason = false;

  for (const arg of args) {
    if (arg === "--reason" || arg === "-r") {
      readingReason = true;
    } else if (readingReason) {
      reason.push(arg);
    } else {
      targets.push(arg);
    }
  }

  return { targets, reason: reason.join(" ").trim() || undefined };
};

const zshQuote = (value: string) => value.replaceAll("\\", "\\\\").replaceAll("'", "'\\''");

export const zshCompletion = () =>
  [
    "#compdef todoctl",
    "",
    "_todoctl() {",
    "  local -a commands",
    "  commands=(",
    ...commands.map((command) => `    '${zshQuote(command.name)}:${zshQuote(command.description)}'`),
    "  )",
    "",
    "  if (( CURRENT == 2 )); then",
    "    _describe -t commands 'todoctl command' commands",
    "    return",
    "  fi",
    "",
    "  case ${words[2]} in",
    "    add)",
    "      _arguments \\",
    "        '(-t --tag)'{-t,--tag}'[add a tag]:tag:' \\",
    "        '*:task title:'",
    "      ;;",
    "    list|ls)",
    "      _arguments \\",
    "        '(-a --all)'{-a,--all}'[show completed and removed tasks]'",
    "      ;;",
    "    start|done|drop|purge)",
    "      _message 'task id or title prefix'",
    "      ;;",
    "    hold)",
    "      _arguments \\",
    "        '(-r --reason)'{-r,--reason}'[record why the task is held]:reason:' \\",
    "        '*:task id or title prefix:'",
    "      ;;",
    "    status)",
    "      _arguments '1:action:(run install uninstall)'",
    "      ;;",
    "    completion)",
    "      _arguments '1:shell:(zsh)'",
    "      ;;",
    "  esac",
    "}",
    "",
    "_todoctl \"$@\"",
  ].join("\n");

export const runTaskCommand = (args: string[]): Outcome => {
  const [verb = "help", ...rest] = args;

  if (verb === "help" || verb === "--help" || verb === "-h") return { code: 0, text: help };
  if (verb === "completion") {
    if (rest[0] === "zsh") return { code: 0, text: zshCompletion() };
    return { code: 2, text: "usage: todoctl completion zsh" };
  }
  if (verb === "status" || verb === "status-icon") {
    if (!rest[0] || rest[0] === "run") return runStatusIcon();
    if (rest[0] === "service") return runStatusIconForeground();
    if (rest[0] === "install") return { code: 0, text: installStatusIcon() };
    if (rest[0] === "uninstall") return { code: 0, text: uninstallStatusIcon() };
    return { code: 2, text: "usage: todoctl status [run|install|uninstall]" };
  }

  const events = loadEvents();
  const tasks = fold(events);

  if (verb === "list" || verb === "ls") {
    return { code: 0, text: formatTasks(tasks, rest.includes("--all") || rest.includes("-a")) };
  }
  if (verb === "add") {
    const { title, tags } = parseAdd(rest);
    if (!title) return { code: 2, text: "usage: todoctl add <title> [--tag name]" };

    const at = now();
    const id = nextId(events);
    saveEvent({ type: "task.added", id, title, tags, at });
    return { code: 0, text: `added ${id}` };
  }

  const hold = verb === "hold" ? parseHold(rest) : undefined;
  const targets = targetsFrom(hold?.targets ?? rest);
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
    if (event.type === "task.held" && hold?.reason) event.reason = hold.reason;
    eventsToSave.push(event);
  }

  for (const event of eventsToSave) saveEvent(event);
  if (verb === "done") notifyDone(resolved.filter((task) => task.state !== "done"));

  return { code: 0, text: `${verb} ${resolved.map((task) => task.id).join(", ")}` };
};

const helpWidth = Math.max("--help".length, ...commands.map((command) => command.usage.length)) + 2;

export const help = [
  "todoctl <command>",
  "",
  "Commands:",
  ...commands.map((command) => `  ${command.usage.padEnd(helpWidth)} ${command.description}`),
  `  ${"--help".padEnd(helpWidth)} show this help`,
  "",
  "Targets can be numeric IDs or title prefixes. Numeric input only matches IDs.",
  "Install zsh completion with: todoctl completion zsh > ~/.local/share/zsh/site-functions/_todoctl",
  "Use commas for multiple targets, for example: todoctl done 1,2,write",
].join("\n");
