import type { Event, Outcome, Task, TaskState } from "./model";
import { installStatusIcon, notifyDone, runStatusIcon, uninstallStatusIcon } from "./desktop";
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
  { name: "hold", usage: "hold <targets>", description: "hold tasks" },
  { name: "done", usage: "done <targets>", description: "finish tasks and notify on new completions" },
  { name: "drop", usage: "drop <targets>", description: "remove tasks from active work" },
  { name: "purge", usage: "purge <targets>", description: "delete task history projection" },
  { name: "status-icon", usage: "status-icon <run|install|uninstall>", description: "manage the tray count icon" },
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
    "    start|hold|done|drop|purge)",
    "      _message 'task id or title prefix'",
    "      ;;",
    "    status-icon)",
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
  if (verb === "status-icon") {
    if (rest[0] === "run") return runStatusIcon();
    if (rest[0] === "install") return { code: 0, text: installStatusIcon() };
    if (rest[0] === "uninstall") return { code: 0, text: uninstallStatusIcon() };
    return { code: 2, text: "usage: todoctl status-icon <run|install|uninstall>" };
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
