import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import type { Task } from "./model";
import { eventLogPath } from "./store";

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

const trayScript = (logPath: string, iconDir: string, pidPath: string) => String.raw`
import json
import os
import signal
import sys
import time
import traceback

binding = None
for name in ("PyQt6", "PySide6", "PyQt5"):
    try:
        if name == "PyQt6":
            from PyQt6.QtCore import QRectF, Qt, QTimer
            from PyQt6.QtGui import QAction, QColor, QFont, QIcon, QPainter, QPen, QPixmap
            from PyQt6.QtWidgets import QApplication, QMenu, QSystemTrayIcon
        elif name == "PySide6":
            from PySide6.QtCore import QRectF, Qt, QTimer
            from PySide6.QtGui import QAction, QColor, QFont, QIcon, QPainter, QPen, QPixmap
            from PySide6.QtWidgets import QApplication, QMenu, QSystemTrayIcon
        else:
            from PyQt5.QtCore import QRectF, Qt, QTimer
            from PyQt5.QtGui import QColor, QFont, QIcon, QPainter, QPen, QPixmap
            from PyQt5.QtWidgets import QAction, QApplication, QMenu, QSystemTrayIcon
        binding = name
        break
    except ImportError:
        pass

if binding is None:
    sys.stderr.write("todoctl: status-icon run requires PyQt6, PySide6, or PyQt5.\n")
    sys.stderr.write("Install a Qt Python binding, then run: todoctl status-icon run\n")
    sys.exit(1)

LOG_PATH = ${JSON.stringify(logPath)}
ICON_DIR = ${JSON.stringify(iconDir)}
PID_PATH = ${JSON.stringify(pidPath)}

def process_is_running(pid):
    try:
        os.kill(pid, 0)
        return True
    except ProcessLookupError:
        return False
    except PermissionError:
        return True

def replace_existing():
    os.makedirs(os.path.dirname(PID_PATH), exist_ok=True)
    try:
        with open(PID_PATH, "r", encoding="utf-8") as handle:
            old_pid = int(handle.read().strip())
    except (FileNotFoundError, ValueError):
        old_pid = None

    if old_pid and old_pid != os.getpid() and process_is_running(old_pid):
        os.kill(old_pid, signal.SIGTERM)
        deadline = time.time() + 3
        while time.time() < deadline and process_is_running(old_pid):
            time.sleep(0.1)
        if process_is_running(old_pid):
            os.kill(old_pid, signal.SIGKILL)

    with open(PID_PATH, "w", encoding="utf-8") as handle:
        handle.write(str(os.getpid()))

def cleanup_pid():
    try:
        with open(PID_PATH, "r", encoding="utf-8") as handle:
            active_pid = int(handle.read().strip())
        if active_pid == os.getpid():
            os.unlink(PID_PATH)
    except (FileNotFoundError, ValueError):
        pass

def cleanup_icons():
    try:
        for name in os.listdir(ICON_DIR):
            if name == "status-icon.svg" or (name.startswith("status-icon-") and name.endswith(".svg")):
                os.unlink(os.path.join(ICON_DIR, name))
    except FileNotFoundError:
        pass
    except OSError:
        traceback.print_exc(file=sys.stderr)
    try:
        os.unlink(os.path.join(os.path.dirname(ICON_DIR), "status-icon.svg"))
    except FileNotFoundError:
        pass
    except OSError:
        traceback.print_exc(file=sys.stderr)

def fold_count():
    tasks = {}
    if not os.path.exists(LOG_PATH):
        return 0
    with open(LOG_PATH, "r", encoding="utf-8") as handle:
        for line in handle:
            if not line.strip():
                continue
            event = json.loads(line)
            task_id = event.get("id")
            event_type = event.get("type")
            if event_type == "task.added":
                tasks[task_id] = "wanted"
            elif event_type == "task.purged":
                tasks.pop(task_id, None)
            elif task_id in tasks:
                tasks[task_id] = {
                    "task.started": "started",
                    "task.held": "held",
                    "task.done": "done",
                    "task.dropped": "removed",
                }.get(event_type, tasks[task_id])
    return sum(1 for state in tasks.values() if state not in ("done", "removed"))

def alignment_center():
    return Qt.AlignmentFlag.AlignCenter if binding in ("PyQt6", "PySide6") else Qt.AlignCenter

def make_icon(count):
    label = "99+" if count > 99 else str(max(0, count))
    font_size = 28 if len(label) > 2 else 38 if len(label) > 1 else 48

    pixmap = QPixmap(64, 64)
    pixmap.fill(QColor("transparent"))

    painter = QPainter(pixmap)
    painter.setRenderHint(QPainter.RenderHint.Antialiasing if binding in ("PyQt6", "PySide6") else QPainter.Antialiasing)
    painter.setBrush(QColor("#dc2626" if count > 0 else "#16a34a"))
    painter.setPen(QPen(QColor("transparent")))
    painter.drawRoundedRect(QRectF(0, 0, 64, 64), 12, 12)

    check_pen = QPen(QColor(255, 255, 255, 56))
    check_pen.setWidth(7)
    painter.setPen(check_pen)
    painter.drawLine(16, 34, 27, 45)
    painter.drawLine(27, 45, 48, 20)

    font = QFont("Arial", font_size)
    font.setBold(True)
    painter.setFont(font)
    painter.setPen(QColor("#ffffff"))
    painter.drawText(QRectF(0, 0, 64, 64), alignment_center(), label)
    painter.end()

    return QIcon(pixmap)

replace_existing()
app = QApplication(sys.argv)
if not QSystemTrayIcon.isSystemTrayAvailable():
    sys.stderr.write("todoctl: no system tray is available in this desktop session.\n")
    cleanup_pid()
    cleanup_icons()
    sys.exit(1)

tray = QSystemTrayIcon()
menu = QMenu()
refresh_action = QAction("Refresh")
quit_action = QAction("Quit")
menu.addAction(refresh_action)
menu.addAction(quit_action)
tray.setContextMenu(menu)

last_count = None
last_mtime = None
shutting_down = False
timer = None

def shutdown():
    global shutting_down
    if shutting_down:
        return
    shutting_down = True
    if timer is not None:
        timer.stop()
    tray.hide()
    tray.setVisible(False)
    cleanup_pid()
    cleanup_icons()
    app.quit()

def handle_signal(_signum, _frame):
    shutdown()

def refresh(force=False):
    global last_count, last_mtime
    try:
        mtime = os.path.getmtime(LOG_PATH)
    except FileNotFoundError:
        mtime = None
    if not force and mtime == last_mtime:
        return
    count = fold_count()
    if force or count != last_count:
        tray.setIcon(make_icon(count))
        label = "incomplete todo" if count == 1 else "incomplete todos"
        tray.setToolTip(f"To-Do Kubuntu: {count} {label}")
        last_count = count
    last_mtime = mtime

refresh_action.triggered.connect(lambda: refresh(True))
quit_action.triggered.connect(shutdown)
app.aboutToQuit.connect(shutdown)
signal.signal(signal.SIGINT, handle_signal)
signal.signal(signal.SIGTERM, handle_signal)
refresh(True)
tray.show()

timer = QTimer()
timer.timeout.connect(refresh)
timer.start(2000)
sys.exit(app.exec())
`;

const notify = (summary: string, body: string, icon = "view-task") => {
  spawnSync("notify-send", ["--app-name=todoctl", `--icon=${icon}`, summary, body], {
    stdio: "ignore",
  });
};

export const notifyDone = (tasks: Task[]) => {
  for (const task of tasks) notify("To-Do Kubuntu", `Done: ${task.title}`);
};

export const runStatusIcon = () => {
  const child = spawn("python3", ["-c", trayScript(eventLogPath(), statusIconDir(), statusIconPidPath())], {
    stdio: "inherit",
  });

  const stop = (signal: "SIGINT" | "SIGTERM") => {
    child.kill(signal);
  };

  process.on("SIGINT", () => stop("SIGINT"));
  process.on("SIGTERM", () => stop("SIGTERM"));

  child.on("error", (error) => {
    process.stderr.write(`todoctl: status icon failed to start: ${String(error)}\n`);
    process.exit(1);
  });
  child.on("exit", (code, signal) => {
    process.exit(code ?? (signal ? 128 : 0));
  });

  return { code: 0, text: "" };
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
