#!/usr/bin/env zsh
set -euo pipefail

service_name="kubuntu-icon-switcher.service"
project_directory="${0:A:h}"
config_home="${XDG_CONFIG_HOME:-$HOME/.config}"
service_directory="$config_home/systemd/user"
service_path="$service_directory/$service_name"
app_config_directory="$config_home/kubuntu-icon-switcher"
environment_path="$app_config_directory/service.env"
npm_path="${NPM_PATH:-}"
node_path="${NODE_BIN:-}"
user_id="$(id -u)"
user_name="$(id -un)"
runtime_directory="${XDG_RUNTIME_DIR:-/run/user/$user_id}"
session_bus_address="${DBUS_SESSION_BUS_ADDRESS:-unix:path=$runtime_directory/bus}"
display_name="${DISPLAY:-:0}"
default_xauthority_path="$HOME/.Xauthority"
xauthority_path=""
stable_path="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/games:/usr/local/games:/snap/bin"

if [[ -f "$default_xauthority_path" ]]; then
  xauthority_path="$default_xauthority_path"
elif [[ -n "${XAUTHORITY:-}" && "${XAUTHORITY:-}" != /tmp/* ]]; then
  xauthority_path="$XAUTHORITY"
fi

if [[ -z "$npm_path" ]]; then
  npm_path="$(command -v npm || true)"
fi

if [[ -z "$node_path" ]]; then
  node_path="$(command -v node || true)"
fi

if [[ -z "$npm_path" ]]; then
  print -u2 "npm was not found on PATH."
  exit 1
fi

if [[ -z "$node_path" ]]; then
  print -u2 "node was not found on PATH."
  exit 1
fi

if ! command -v systemctl >/dev/null 2>&1; then
  print -u2 "systemctl was not found on PATH."
  exit 1
fi

print "Installing Firefox native messaging host..."
(
  cd "$project_directory"
  "$npm_path" run install-firefox-host
)

runtime_path="$project_directory/dist/src/cli.js"

if [[ ! -f "$runtime_path" ]]; then
  print -u2 "Expected built watcher runtime was not found: $runtime_path"
  exit 1
fi

print "Writing user systemd service to $service_path..."
mkdir -p "$service_directory" "$app_config_directory"

print "Writing captured KDE session environment to $environment_path..."
{
  print "HOME=$HOME"
  print "USER=$user_name"
  print "LOGNAME=$user_name"
  print "XDG_RUNTIME_DIR=$runtime_directory"
  print "DBUS_SESSION_BUS_ADDRESS=$session_bus_address"
  print "DISPLAY=$display_name"
  print "PATH=$stable_path"

  if [[ -n "$xauthority_path" ]]; then
    print "XAUTHORITY=$xauthority_path"
  fi

  if [[ -n "${XDG_CURRENT_DESKTOP:-}" ]]; then
    print "XDG_CURRENT_DESKTOP=$XDG_CURRENT_DESKTOP"
  fi

  if [[ -n "${XDG_SESSION_DESKTOP:-}" ]]; then
    print "XDG_SESSION_DESKTOP=$XDG_SESSION_DESKTOP"
  fi

  if [[ -n "${XDG_SESSION_TYPE:-}" ]]; then
    print "XDG_SESSION_TYPE=$XDG_SESSION_TYPE"
  fi

  if [[ -n "${KDE_FULL_SESSION:-}" ]]; then
    print "KDE_FULL_SESSION=$KDE_FULL_SESSION"
  fi

  if [[ -n "${KDE_SESSION_VERSION:-}" ]]; then
    print "KDE_SESSION_VERSION=$KDE_SESSION_VERSION"
  fi
} > "$environment_path"

cat > "$service_path" <<SERVICE
[Unit]
Description=Kubuntu Icon Switcher Firefox artwork watcher
After=graphical-session.target
PartOf=graphical-session.target

[Service]
Type=simple
WorkingDirectory=$project_directory
EnvironmentFile=$environment_path
ExecStartPre=/bin/sh -c 'for i in \$(seq 1 30); do test -S "$runtime_directory/bus" && exit 0; sleep 1; done; exit 1'
ExecStart=$node_path $runtime_path watch-firefox
Restart=always
RestartSec=3

[Install]
WantedBy=graphical-session.target
SERVICE

print "Reloading user systemd units..."
systemctl --user daemon-reload

print "Removing any older default-target autostart links..."
systemctl --user disable "$service_name" >/dev/null 2>&1 || true

print "Enabling $service_name for Plasma graphical-session autostart..."
systemctl --user enable "$service_name"

print "Restarting $service_name..."
systemctl --user reset-failed "$service_name" >/dev/null 2>&1 || true
systemctl --user restart "$service_name"

print "Service installed, enabled, and restarted."
print "Enabled state: $(systemctl --user is-enabled "$service_name")"
print "Active state: $(systemctl --user is-active "$service_name")"
print "View logs with:"
print "  journalctl --user -u $service_name -f"
