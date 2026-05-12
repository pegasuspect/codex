import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { SessionBus, readBodyValues } from "./dbus";
import type { Event, Task, TaskState } from "./model";
import { loadEvents } from "./store";

const cacheHome = () =>
  process.env.XDG_CACHE_HOME ?? join(homedir(), ".cache");

const runtimeHome = () =>
  process.env.XDG_RUNTIME_DIR ?? join(cacheHome(), "to-do-kubuntu", "run");

const statusIconDir = () =>
  join(cacheHome(), "to-do-kubuntu", "status-icons");

const statusIconPidPath = () =>
  join(runtimeHome(), "todoctl-status-icon.pid");

const autostartPath = () =>
  join(homedir(), ".config", "autostart", "todoctl-status-icon.desktop");

const quoteDesktopExecPart = (value: string) => `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;

const runCommand = () =>
  [process.execPath, process.argv[1], "status-icon", "run"].map(quoteDesktopExecPart).join(" ");

const escapeXml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const iconName = (count: number) => `todoctl-status-${Math.max(0, Math.min(99, count))}`;

const writeStatusIcon = (count: number): string => {
  const dir = statusIconDir();
  const name = iconName(count);
  const path = join(dir, `${name}.svg`);
  const label = count > 99 ? "99+" : String(Math.max(0, count));
  const fontSize = label.length > 2 ? 22 : label.length > 1 ? 28 : 34;

  mkdirSync(dir, { recursive: true });
  writeFileSync(
    path,
    [
      '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">',
      `  <rect width="64" height="64" rx="12" fill="${count > 0 ? "#dc2626" : "#16a34a"}"/>`,
      '  <path d="M17 32.5 27 42l20-22" fill="none" stroke="#ffffff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" opacity=".22"/>',
      `  <text x="32" y="33.5" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="700" fill="#ffffff">${escapeXml(label)}</text>`,
      "</svg>",
      "",
    ].join("\n"),
  );

  return name;
};

const removeIfExists = (path: string) => {
  if (existsSync(path)) unlinkSync(path);
};

const cleanupIcons = () => {
  for (let count = 0; count <= 99; count += 1) removeIfExists(join(statusIconDir(), `${iconName(count)}.svg`));
};

const processIsRunning = (pid: number) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

const replaceExistingStatusIcon = () => {
  const pidPath = statusIconPidPath();
  mkdirSync(dirname(pidPath), { recursive: true });

  if (existsSync(pidPath)) {
    const oldPid = Number(readFileSync(pidPath, "utf8").trim());
    if (Number.isInteger(oldPid) && oldPid > 0 && oldPid !== process.pid && processIsRunning(oldPid)) {
      process.kill(oldPid, "SIGTERM");
    }
  }

  writeFileSync(pidPath, String(process.pid));
};

const cleanupPid = () => {
  const pidPath = statusIconPidPath();
  if (!existsSync(pidPath)) return;
  const activePid = Number(readFileSync(pidPath, "utf8").trim());
  if (activePid === process.pid) removeIfExists(pidPath);
};

const statusNotifierInterface = "org.kde.StatusNotifierItem";
const statusNotifierPath = "/StatusNotifierItem";
const propertiesInterface = "org.freedesktop.DBus.Properties";
const introspectInterface = "org.freedesktop.DBus.Introspectable";

class StatusNotifierItem {
  count = 0;
  icon = writeStatusIcon(0);

  get Category() {
    return "ApplicationStatus";
  }

  get Id() {
    return "todoctl-status-icon";
  }

  get Title() {
    return "To-Do Kubuntu";
  }

  get Status() {
    return "Active";
  }

  get WindowId() {
    return 0;
  }

  get IconName() {
    return this.icon;
  }

  get IconThemePath() {
    return statusIconDir();
  }

  get OverlayIconName() {
    return "";
  }

  get AttentionIconName() {
    return "";
  }

  get AttentionMovieName() {
    return "";
  }

  get ToolTip() {
    const label = this.count === 1 ? "incomplete todo" : "incomplete todos";
    return ["", [], "To-Do Kubuntu", `${this.count} ${label}`];
  }

  get ItemIsMenu() {
    return false;
  }

  ContextMenu(_x: number, _y: number) {}

  Activate(_x: number, _y: number) {}

  SecondaryActivate(_x: number, _y: number) {}

  Scroll(_delta: number, _orientation: string) {}

  NewTitle() {}

  update(bus: SessionBus, count: number) {
    if (count === this.count) return;
    this.count = count;
    this.icon = writeStatusIcon(count);
    bus.signal(statusNotifierPath, statusNotifierInterface, "NewIcon");
    bus.signal(statusNotifierPath, statusNotifierInterface, "NewToolTip");
  }

  property(name: string): [string, unknown] | undefined {
    const properties: Record<string, [string, unknown]> = {
      Category: ["s", this.Category],
      Id: ["s", this.Id],
      Title: ["s", this.Title],
      Status: ["s", this.Status],
      WindowId: ["i", this.WindowId],
      IconName: ["s", this.IconName],
      IconThemePath: ["s", this.IconThemePath],
      OverlayIconName: ["s", this.OverlayIconName],
      AttentionIconName: ["s", this.AttentionIconName],
      AttentionMovieName: ["s", this.AttentionMovieName],
      ToolTip: ["(sa(iiay)ss)", this.ToolTip],
      ItemIsMenu: ["b", this.ItemIsMenu],
    };
    return properties[name];
  }
}

const introspectionXml = `<!DOCTYPE node PUBLIC "-//freedesktop//DTD D-BUS Object Introspection 1.0//EN" "http://www.freedesktop.org/standards/dbus/1.0/introspect.dtd">
<node>
  <interface name="org.freedesktop.DBus.Introspectable">
    <method name="Introspect"><arg name="xml" type="s" direction="out"/></method>
  </interface>
  <interface name="org.freedesktop.DBus.Properties">
    <method name="Get"><arg name="interface" type="s" direction="in"/><arg name="property" type="s" direction="in"/><arg name="value" type="v" direction="out"/></method>
  </interface>
  <interface name="org.kde.StatusNotifierItem">
    <property name="Category" type="s" access="read"/>
    <property name="Id" type="s" access="read"/>
    <property name="Title" type="s" access="read"/>
    <property name="Status" type="s" access="read"/>
    <property name="WindowId" type="i" access="read"/>
    <property name="IconName" type="s" access="read"/>
    <property name="IconThemePath" type="s" access="read"/>
    <property name="OverlayIconName" type="s" access="read"/>
    <property name="AttentionIconName" type="s" access="read"/>
    <property name="AttentionMovieName" type="s" access="read"/>
    <property name="ToolTip" type="(sa(iiay)ss)" access="read"/>
    <property name="ItemIsMenu" type="b" access="read"/>
    <method name="ContextMenu"><arg name="x" type="i" direction="in"/><arg name="y" type="i" direction="in"/></method>
    <method name="Activate"><arg name="x" type="i" direction="in"/><arg name="y" type="i" direction="in"/></method>
    <method name="SecondaryActivate"><arg name="x" type="i" direction="in"/><arg name="y" type="i" direction="in"/></method>
    <method name="Scroll"><arg name="delta" type="i" direction="in"/><arg name="orientation" type="s" direction="in"/></method>
    <signal name="NewIcon"/>
    <signal name="NewToolTip"/>
  </interface>
</node>`;

const notify = (summary: string, body: string, icon = "view-task") => {
  spawnSync("notify-send", ["--app-name=todoctl", `--icon=${icon}`, summary, body], {
    stdio: "ignore",
  });
};

export const notifyDone = (tasks: Task[]) => {
  for (const task of tasks) notify("To-Do Kubuntu", `Done: ${task.title}`);
};

export const runStatusIcon = () => {
  void runStatusIconService();

  return { code: 0, text: "" };
};

const incompleteCount = () => {
  const states = new Map<string, TaskState>();

  for (const event of loadEvents() as Event[]) {
    if (event.type === "task.added") {
      states.set(event.id, "wanted");
    } else if (event.type === "task.purged") {
      states.delete(event.id);
    } else if (states.has(event.id)) {
      const stateByEvent: Record<typeof event.type, TaskState> = {
        "task.started": "started",
        "task.held": "held",
        "task.done": "done",
        "task.dropped": "removed",
      };
      states.set(event.id, stateByEvent[event.type]);
    }
  }

  return [...states.values()].filter((state) => state !== "done" && state !== "removed").length;
};

const runStatusIconService = async () => {
  replaceExistingStatusIcon();

  const serviceName = `org.kde.StatusNotifierItem-${process.pid}-1`;
  let timer: ReturnType<typeof setInterval> | undefined;
  let shuttingDown = false;
  let bus: SessionBus | undefined;

  const shutdown = () => {
    if (shuttingDown) return;
    shuttingDown = true;
    if (timer) clearInterval(timer);
    cleanupPid();
    cleanupIcons();
    bus?.disconnect();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  try {
    const connectedBus = await SessionBus.connect();
    bus = connectedBus;
    const item = new StatusNotifierItem();

    connectedBus.onMethodCall = (message) => {
      if (message.path !== statusNotifierPath) return;
      if (message.interface === introspectInterface && message.member === "Introspect") {
        connectedBus.methodReturn(message, "s", [introspectionXml]);
      } else if (message.interface === propertiesInterface && message.member === "Get") {
        const [, propertyName] = readBodyValues(message, ["s", "s"]);
        const property = item.property(String(propertyName));
        if (property) connectedBus.methodReturn(message, "v", [property]);
      } else if (message.interface === statusNotifierInterface) {
        connectedBus.methodReturn(message);
      }
    };

    await connectedBus.call("org.freedesktop.DBus", "/org/freedesktop/DBus", "org.freedesktop.DBus", "RequestName", "su", [serviceName, 2]);
    item.update(connectedBus, incompleteCount());
    await connectedBus.call("org.kde.StatusNotifierWatcher", "/StatusNotifierWatcher", "org.kde.StatusNotifierWatcher", "RegisterStatusNotifierItem", "s", [serviceName]);

    timer = setInterval(() => item.update(connectedBus, incompleteCount()), 2000);
  } catch (error) {
    cleanupPid();
    cleanupIcons();
    process.stderr.write(`todoctl: status icon failed to start: ${String(error)}\n`);
    process.exit(1);
  }
};

export const installStatusIcon = () => {
  const path = autostartPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(
    path,
    [
      "[Desktop Entry]",
      "Type=Application",
      "Name=To-Do Kubuntu Status Icon",
      "Comment=Show the current incomplete todo count in the system tray",
      `Exec=${runCommand()}`,
      "Terminal=false",
      "X-GNOME-Autostart-enabled=true",
      "X-KDE-autostart-after=panel",
      "",
    ].join("\n"),
  );

  return `installed status icon autostart: ${path}\nStart it now with: todoctl status-icon run`;
};

export const uninstallStatusIcon = () => {
  const path = autostartPath();
  if (existsSync(path)) unlinkSync(path);
  return `removed status icon autostart: ${path}`;
};
