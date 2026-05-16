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
  join(runtimeHome(), "todoctl-status.pid");

const statusIconServiceName = "todoctl-status.service";
const legacyStatusIconServiceName = "todoctl-status-icon.service";

const systemdUserDir = () =>
  join(homedir(), ".config", "systemd", "user");

const statusIconServicePath = () =>
  join(systemdUserDir(), statusIconServiceName);

const legacyStatusIconServicePath = () =>
  join(systemdUserDir(), legacyStatusIconServiceName);

const autostartPath = () =>
  join(homedir(), ".config", "autostart", "todoctl-status.desktop");

const legacyAutostartPath = () =>
  join(homedir(), ".config", "autostart", "todoctl-status-icon.desktop");

const quoteDesktopExecPart = (value: string) => `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;

const serviceCommand = () =>
  [process.execPath, process.argv[1], "status", "service"].map(quoteDesktopExecPart).join(" ");

const escapeXml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const iconName = (count: number) => `todoctl-status-${Math.max(0, Math.min(99, count))}`;

const taskIconColor = { red: 37, green: 99, blue: 235 };

const badgeColor = (count: number) => {
  if (count === 0) return { red: 22, green: 163, blue: 74 };
  if (count < 10) return { red: 217, green: 119, blue: 6 };
  return { red: 220, green: 38, blue: 38 };
};

const glyphs: Record<string, string[]> = {
  "0": ["111", "101", "101", "101", "101", "101", "111"],
  "1": ["010", "110", "010", "010", "010", "010", "111"],
  "2": ["111", "001", "001", "111", "100", "100", "111"],
  "3": ["111", "001", "001", "111", "001", "001", "111"],
  "4": ["101", "101", "101", "111", "001", "001", "001"],
  "5": ["111", "100", "100", "111", "001", "001", "111"],
  "6": ["111", "100", "100", "111", "101", "101", "111"],
  "7": ["111", "001", "001", "010", "010", "010", "010"],
  "8": ["111", "101", "101", "111", "101", "101", "111"],
  "9": ["111", "101", "101", "111", "001", "001", "111"],
  "+": ["000", "010", "010", "111", "010", "010", "000"],
};

const drawPixel = (bytes: Uint8Array, size: number, x: number, y: number, red: number, green: number, blue: number, alpha = 255) => {
  if (x < 0 || y < 0 || x >= size || y >= size) return;
  const offset = (y * size + x) * 4;
  bytes[offset] = alpha;
  bytes[offset + 1] = red;
  bytes[offset + 2] = green;
  bytes[offset + 3] = blue;
};

const drawLabel = (bytes: Uint8Array, size: number, label: string, centerX: number, centerY: number, scale: number) => {
  const gap = scale;
  const glyphWidth = 3 * scale;
  const glyphHeight = 7 * scale;
  const totalWidth = label.length * glyphWidth + (label.length - 1) * gap;
  const startX = Math.floor(centerX - totalWidth / 2);
  const startY = Math.floor(centerY - glyphHeight / 2);

  for (let charIndex = 0; charIndex < label.length; charIndex += 1) {
    const glyph = glyphs[label[charIndex]] ?? glyphs["0"];
    const glyphX = startX + charIndex * (glyphWidth + gap);
    for (let row = 0; row < glyph.length; row += 1) {
      for (let col = 0; col < glyph[row].length; col += 1) {
        if (glyph[row][col] !== "1") continue;
        for (let y = 0; y < scale; y += 1) {
          for (let x = 0; x < scale; x += 1) {
            drawPixel(bytes, size, glyphX + col * scale + x, startY + row * scale + y, 255, 255, 255);
          }
        }
      }
    }
  }
};

const drawCircle = (bytes: Uint8Array, size: number, centerX: number, centerY: number, radius: number, color: { red: number; green: number; blue: number }) => {
  for (let y = centerY - radius; y <= centerY + radius; y += 1) {
    for (let x = centerX - radius; x <= centerX + radius; x += 1) {
      if ((x - centerX) ** 2 + (y - centerY) ** 2 <= radius ** 2) {
        drawPixel(bytes, size, x, y, color.red, color.green, color.blue);
      }
    }
  }
};

const iconPixmap = (count: number): [number, number, Uint8Array][] => {
  const size = 64;
  const radius = 12;
  const bytes = new Uint8Array(size * size * 4);
  const label = count > 99 ? "99+" : String(Math.max(0, count));
  const badge = badgeColor(count);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const inLeft = x < radius;
      const inRight = x >= size - radius;
      const inTop = y < radius;
      const inBottom = y >= size - radius;
      const inCorner = (inLeft || inRight) && (inTop || inBottom);
      const cornerX = inLeft ? radius : size - radius - 1;
      const cornerY = inTop ? radius : size - radius - 1;
      const inside = !inCorner || ((x - cornerX) ** 2 + (y - cornerY) ** 2 <= radius ** 2);
      const offset = (y * size + x) * 4;
      bytes[offset] = inside ? 255 : 0;
      bytes[offset + 1] = taskIconColor.red;
      bytes[offset + 2] = taskIconColor.green;
      bytes[offset + 3] = taskIconColor.blue;
    }
  }

  for (let point = 0; point <= 1; point += 0.02) {
    const x = Math.round(14 + (27 - 14) * point);
    const y = Math.round(34 + (47 - 34) * point);
    drawCircle(bytes, size, x, y, 3, { red: 255, green: 255, blue: 255 });
  }
  for (let point = 0; point <= 1; point += 0.02) {
    const x = Math.round(27 + (50 - 27) * point);
    const y = Math.round(47 + (19 - 47) * point);
    drawCircle(bytes, size, x, y, 3, { red: 255, green: 255, blue: 255 });
  }
  drawCircle(bytes, size, 45, 20, 18, { red: 255, green: 255, blue: 255 });
  drawCircle(bytes, size, 45, 20, 15, badge);
  drawLabel(bytes, size, label, 45, 20, label.length > 2 ? 3 : label.length > 1 ? 4 : 5);
  return [[size, size, bytes]];
};

const writeStatusIcon = (count: number): string => {
  const dir = statusIconDir();
  const name = iconName(count);
  const path = join(dir, `${name}.svg`);
  const label = count > 99 ? "99+" : String(Math.max(0, count));
  const fontSize = label.length > 2 ? 13 : label.length > 1 ? 16 : 20;

  mkdirSync(dir, { recursive: true });
  writeFileSync(
    path,
    [
      '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">',
      '  <rect width="64" height="64" rx="12" fill="#2563eb"/>',
      '  <path d="M15 34 27 46l23-27" fill="none" stroke="#ffffff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" opacity=".82"/>',
      '  <circle cx="45" cy="20" r="18" fill="#ffffff"/>',
      `  <circle cx="45" cy="20" r="15" fill="${count === 0 ? "#16a34a" : count < 10 ? "#d97706" : "#dc2626"}"/>`,
      `  <text x="45" y="21.5" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="700" fill="#ffffff">${escapeXml(label)}</text>`,
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
const statusNotifierMenuPath = "/StatusNotifierItem/Menu";
const propertiesInterface = "org.freedesktop.DBus.Properties";
const introspectInterface = "org.freedesktop.DBus.Introspectable";
const dbusMenuInterface = "com.canonical.dbusmenu";

class StatusNotifierItem {
  count = 0;
  icon = writeStatusIcon(0);

  get Category() {
    return "ApplicationStatus";
  }

  get Id() {
    return "todoctl-status";
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

  get IconPixmap() {
    return iconPixmap(this.count);
  }

  get IconThemePath() {
    return statusIconDir();
  }

  get OverlayIconName() {
    return "";
  }

  get OverlayIconPixmap() {
    return [];
  }

  get AttentionIconName() {
    return "";
  }

  get AttentionIconPixmap() {
    return [];
  }

  get AttentionMovieName() {
    return "";
  }

  get ToolTip() {
    const label = this.count === 1 ? "incomplete todo" : "incomplete todos";
    return ["", this.IconPixmap, "To-Do Kubuntu", `${this.count} ${label}`];
  }

  get ItemIsMenu() {
    return false;
  }

  get Menu() {
    return statusNotifierMenuPath;
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
      IconPixmap: ["a(iiay)", this.IconPixmap],
      IconThemePath: ["s", this.IconThemePath],
      OverlayIconName: ["s", this.OverlayIconName],
      OverlayIconPixmap: ["a(iiay)", this.OverlayIconPixmap],
      AttentionIconName: ["s", this.AttentionIconName],
      AttentionIconPixmap: ["a(iiay)", this.AttentionIconPixmap],
      AttentionMovieName: ["s", this.AttentionMovieName],
      ToolTip: ["(sa(iiay)ss)", this.ToolTip],
      ItemIsMenu: ["b", this.ItemIsMenu],
      Menu: ["o", this.Menu],
    };
    return properties[name];
  }

  properties() {
    return Object.fromEntries(
      [
        "Category",
        "Id",
        "Title",
        "Status",
        "WindowId",
        "IconName",
        "IconPixmap",
        "IconThemePath",
        "OverlayIconName",
        "OverlayIconPixmap",
        "AttentionIconName",
        "AttentionIconPixmap",
        "AttentionMovieName",
        "ToolTip",
        "ItemIsMenu",
        "Menu",
      ].map((name) => [name, this.property(name)]).filter((entry): entry is [string, [string, unknown]] => entry[1] !== undefined),
    );
  }
}

class StatusIconMenu {
  revision = 1;

  constructor(
    private readonly exit: () => void,
    private readonly uninstall: () => void,
  ) {}

  property(name: string): [string, unknown] | undefined {
    const properties: Record<string, [string, unknown]> = {
      Version: ["u", 0],
      TextDirection: ["s", "ltr"],
      Status: ["s", "normal"],
      IconThemePath: ["as", []],
    };
    return properties[name];
  }

  properties() {
    return Object.fromEntries(
      ["Version", "TextDirection", "Status", "IconThemePath"]
        .map((name) => [name, this.property(name)])
        .filter((entry): entry is [string, [string, unknown]] => entry[1] !== undefined),
    );
  }

  itemProperties(id: number): Record<string, [string, unknown]> {
    if (id === 1) return { label: ["s", "Exit"], enabled: ["b", true], visible: ["b", true] };
    if (id === 2) return { label: ["s", "Uninstall"], enabled: ["b", true], visible: ["b", true] };
    return {};
  }

  layout() {
    return [
      0,
      { "children-display": ["s", "submenu"] },
      [
        ["(ia{sv}av)", [1, this.itemProperties(1), []]],
        ["(ia{sv}av)", [2, this.itemProperties(2), []]],
      ],
    ];
  }

  groupProperties(ids: number[]) {
    const selected = ids.includes(0) ? [0, 1, 2] : ids;
    return selected.map((id) => [id, this.itemProperties(id)]);
  }

  event(id: number, eventId: string) {
    if (id === 1 && eventId === "clicked") setTimeout(this.exit, 250);
    if (id === 2 && eventId === "clicked") setTimeout(this.uninstall, 250);
  }
}

const introspectionXml = `<!DOCTYPE node PUBLIC "-//freedesktop//DTD D-BUS Object Introspection 1.0//EN" "http://www.freedesktop.org/standards/dbus/1.0/introspect.dtd">
<node>
  <interface name="org.freedesktop.DBus.Introspectable">
    <method name="Introspect"><arg name="xml" type="s" direction="out"/></method>
  </interface>
  <interface name="org.freedesktop.DBus.Properties">
    <method name="Get"><arg name="interface" type="s" direction="in"/><arg name="property" type="s" direction="in"/><arg name="value" type="v" direction="out"/></method>
    <method name="GetAll"><arg name="interface" type="s" direction="in"/><arg name="properties" type="a{sv}" direction="out"/></method>
  </interface>
  <interface name="org.kde.StatusNotifierItem">
    <property name="Category" type="s" access="read"/>
    <property name="Id" type="s" access="read"/>
    <property name="Title" type="s" access="read"/>
    <property name="Status" type="s" access="read"/>
    <property name="WindowId" type="i" access="read"/>
    <property name="IconName" type="s" access="read"/>
    <property name="IconPixmap" type="a(iiay)" access="read"/>
    <property name="IconThemePath" type="s" access="read"/>
    <property name="OverlayIconName" type="s" access="read"/>
    <property name="OverlayIconPixmap" type="a(iiay)" access="read"/>
    <property name="AttentionIconName" type="s" access="read"/>
    <property name="AttentionIconPixmap" type="a(iiay)" access="read"/>
    <property name="AttentionMovieName" type="s" access="read"/>
    <property name="ToolTip" type="(sa(iiay)ss)" access="read"/>
    <property name="ItemIsMenu" type="b" access="read"/>
    <property name="Menu" type="o" access="read"/>
    <method name="ContextMenu"><arg name="x" type="i" direction="in"/><arg name="y" type="i" direction="in"/></method>
    <method name="Activate"><arg name="x" type="i" direction="in"/><arg name="y" type="i" direction="in"/></method>
    <method name="SecondaryActivate"><arg name="x" type="i" direction="in"/><arg name="y" type="i" direction="in"/></method>
    <method name="Scroll"><arg name="delta" type="i" direction="in"/><arg name="orientation" type="s" direction="in"/></method>
    <signal name="NewIcon"/>
    <signal name="NewToolTip"/>
  </interface>
</node>`;

const menuIntrospectionXml = `<!DOCTYPE node PUBLIC "-//freedesktop//DTD D-BUS Object Introspection 1.0//EN" "http://www.freedesktop.org/standards/dbus/1.0/introspect.dtd">
<node>
  <interface name="org.freedesktop.DBus.Introspectable">
    <method name="Introspect"><arg name="xml" type="s" direction="out"/></method>
  </interface>
  <interface name="org.freedesktop.DBus.Properties">
    <method name="Get"><arg name="interface" type="s" direction="in"/><arg name="property" type="s" direction="in"/><arg name="value" type="v" direction="out"/></method>
    <method name="GetAll"><arg name="interface" type="s" direction="in"/><arg name="properties" type="a{sv}" direction="out"/></method>
  </interface>
  <interface name="com.canonical.dbusmenu">
    <property name="Version" type="u" access="read"/>
    <property name="TextDirection" type="s" access="read"/>
    <property name="Status" type="s" access="read"/>
    <property name="IconThemePath" type="as" access="read"/>
    <method name="GetLayout">
      <arg name="parentId" type="i" direction="in"/>
      <arg name="recursionDepth" type="i" direction="in"/>
      <arg name="propertyNames" type="as" direction="in"/>
      <arg name="revision" type="u" direction="out"/>
      <arg name="layout" type="(ia{sv}av)" direction="out"/>
    </method>
    <method name="GetGroupProperties">
      <arg name="ids" type="ai" direction="in"/>
      <arg name="propertyNames" type="as" direction="in"/>
      <arg name="properties" type="a(ia{sv})" direction="out"/>
    </method>
    <method name="AboutToShow">
      <arg name="id" type="i" direction="in"/>
      <arg name="needUpdate" type="b" direction="out"/>
    </method>
    <method name="Event">
      <arg name="id" type="i" direction="in"/>
      <arg name="eventId" type="s" direction="in"/>
      <arg name="data" type="v" direction="in"/>
      <arg name="timestamp" type="u" direction="in"/>
    </method>
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

const writeStatusIconService = () => {
  const path = statusIconServicePath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(
    path,
    [
      "[Unit]",
      "Description=To-Do Kubuntu status tray service",
      "After=graphical-session.target",
      "PartOf=graphical-session.target",
      "",
      "[Service]",
      "Type=simple",
      `ExecStart=${serviceCommand()}`,
      "Restart=on-failure",
      "RestartSec=2",
      "",
      "[Install]",
      "WantedBy=default.target",
      "",
    ].join("\n"),
  );
  return path;
};

const systemctlUser = (args: string[]) => {
  const result = spawnSync("systemctl", ["--user", ...args], { stdio: "inherit" });
  if (result.error) return `todoctl: systemctl --user ${args.join(" ")} failed: ${String(result.error)}`;
  if (result.status !== 0) return `todoctl: systemctl --user ${args.join(" ")} exited ${result.status}`;
  return undefined;
};

const purgeStatusIconGeneratedFiles = () => {
  const path = statusIconServicePath();
  if (existsSync(path)) unlinkSync(path);
  if (existsSync(legacyStatusIconServicePath())) unlinkSync(legacyStatusIconServicePath());
  if (existsSync(autostartPath())) unlinkSync(autostartPath());
  if (existsSync(legacyAutostartPath())) unlinkSync(legacyAutostartPath());
  cleanupPid();
  cleanupIcons();
  return path;
};

export const runStatusIcon = () => {
  const path = writeStatusIconService();
  const reloadError = systemctlUser(["daemon-reload"]);
  if (reloadError) return { code: 1, text: reloadError };
  const restartError = systemctlUser(["restart", statusIconServiceName]);
  if (restartError) return { code: 1, text: restartError };
  return { code: 0, text: `started status user service: ${statusIconServiceName}\nUnit: ${path}` };
};

export const runStatusIconForeground = () => {
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
    const uninstallFromMenu = () => {
      const disableError = systemctlUser(["disable", statusIconServiceName]);
      if (disableError) process.stderr.write(`${disableError}\n`);
      const legacyDisableError = systemctlUser(["disable", legacyStatusIconServiceName]);
      if (legacyDisableError) process.stderr.write(`${legacyDisableError}\n`);
      purgeStatusIconGeneratedFiles();
      const reloadError = systemctlUser(["daemon-reload"]);
      if (reloadError) process.stderr.write(`${reloadError}\n`);
      const resetError = systemctlUser(["reset-failed", statusIconServiceName]);
      if (resetError) process.stderr.write(`${resetError}\n`);
      shutdown();
    };
    const menu = new StatusIconMenu(shutdown, uninstallFromMenu);

    connectedBus.onMethodCall = (message) => {
      if (message.path === statusNotifierMenuPath) {
        if (message.interface === introspectInterface && message.member === "Introspect") {
          connectedBus.methodReturn(message, "s", [menuIntrospectionXml]);
        } else if (message.interface === propertiesInterface && message.member === "Get") {
          const [, propertyName] = readBodyValues(message, ["s", "s"]);
          const property = menu.property(String(propertyName));
          if (property) connectedBus.methodReturn(message, "v", [property]);
        } else if (message.interface === propertiesInterface && message.member === "GetAll") {
          connectedBus.methodReturn(message, "a{sv}", [menu.properties()]);
        } else if (message.interface === dbusMenuInterface && message.member === "GetLayout") {
          connectedBus.methodReturn(message, "u(ia{sv}av)", [menu.revision, menu.layout()]);
        } else if (message.interface === dbusMenuInterface && message.member === "GetGroupProperties") {
          const [ids] = readBodyValues(message, ["ai", "as"]);
          connectedBus.methodReturn(message, "a(ia{sv})", [menu.groupProperties(ids as number[])]);
        } else if (message.interface === dbusMenuInterface && message.member === "AboutToShow") {
          connectedBus.methodReturn(message, "b", [false]);
        } else if (message.interface === dbusMenuInterface && message.member === "Event") {
          const [id, eventId] = readBodyValues(message, ["i", "s", "v", "u"]);
          connectedBus.methodReturn(message);
          menu.event(Number(id), String(eventId));
        }
        return;
      }

      if (message.path !== statusNotifierPath) return;
      if (message.interface === introspectInterface && message.member === "Introspect") {
        connectedBus.methodReturn(message, "s", [introspectionXml]);
      } else if (message.interface === propertiesInterface && message.member === "Get") {
        const [, propertyName] = readBodyValues(message, ["s", "s"]);
        const property = item.property(String(propertyName));
        if (property) connectedBus.methodReturn(message, "v", [property]);
      } else if (message.interface === propertiesInterface && message.member === "GetAll") {
        connectedBus.methodReturn(message, "a{sv}", [item.properties()]);
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
  const path = writeStatusIconService();
  const reloadError = systemctlUser(["daemon-reload"]);
  if (reloadError) return reloadError;
  const enableError = systemctlUser(["enable", statusIconServiceName]);
  if (enableError) return enableError;
  if (existsSync(autostartPath())) unlinkSync(autostartPath());
  if (existsSync(legacyAutostartPath())) unlinkSync(legacyAutostartPath());
  return `installed status user service: ${path}\nStart it now with: todoctl status run`;
};

export const uninstallStatusIcon = () => {
  const path = statusIconServicePath();
  if (existsSync(path)) {
    const disableError = systemctlUser(["disable", "--now", statusIconServiceName]);
    if (disableError) return disableError;
  }
  if (existsSync(legacyStatusIconServicePath())) {
    const legacyDisableError = systemctlUser(["disable", "--now", legacyStatusIconServiceName]);
    if (legacyDisableError) return legacyDisableError;
  }
  purgeStatusIconGeneratedFiles();
  const reloadError = systemctlUser(["daemon-reload"]);
  if (reloadError) return reloadError;
  const resetError = systemctlUser(["reset-failed", statusIconServiceName]);
  if (resetError) return resetError;
  return `removed status user service: ${path}`;
};
