#!/usr/bin/env zsh
set -euo pipefail

service_name="kubuntu-icon-switcher.service"
project_directory="${0:A:h}"
service_directory="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"
service_path="$service_directory/$service_name"
npm_path="${NPM_PATH:-}"
node_path="${NODE_BIN:-}"

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
mkdir -p "$service_directory"

cat > "$service_path" <<SERVICE
[Unit]
Description=Kubuntu Icon Switcher Firefox artwork watcher

[Service]
Type=simple
WorkingDirectory=$project_directory
Environment=HOME=$HOME
ExecStart=$node_path $runtime_path watch-firefox
Restart=always
RestartSec=3

[Install]
WantedBy=default.target
SERVICE

print "Reloading user systemd units..."
systemctl --user daemon-reload

print "Enabling $service_name for login autostart..."
systemctl --user enable "$service_name"

if command -v loginctl >/dev/null 2>&1; then
  if [[ "$(loginctl show-user "$USER" -p Linger --value 2>/dev/null || true)" != "yes" ]]; then
    print "Attempting to enable user lingering for boot/session reliability..."
    loginctl enable-linger "$USER" >/dev/null 2>&1 || print "Could not enable lingering without additional privileges; service will still start when your user session starts."
  fi
fi

print "Restarting $service_name..."
systemctl --user reset-failed "$service_name" >/dev/null 2>&1 || true
systemctl --user restart "$service_name"

print "Service installed, enabled, and restarted."
print "Enabled state: $(systemctl --user is-enabled "$service_name")"
print "Active state: $(systemctl --user is-active "$service_name")"
print "View logs with:"
print "  journalctl --user -u $service_name -f"
