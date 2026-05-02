#!/usr/bin/env zsh
set -euo pipefail

service_name="kubuntu-icon-switcher.service"
project_directory="${0:A:h}"
service_directory="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"
service_path="$service_directory/$service_name"
npm_path="${NPM_PATH:-$(command -v npm)}"

if [[ -z "$npm_path" ]]; then
  print -u2 "npm was not found on PATH."
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

print "Writing user systemd service to $service_path..."
mkdir -p "$service_directory"

cat > "$service_path" <<SERVICE
[Unit]
Description=Kubuntu Icon Switcher Firefox artwork watcher
After=graphical-session.target

[Service]
Type=simple
WorkingDirectory=$project_directory
ExecStart=$npm_path run watch-firefox
Restart=on-failure
RestartSec=3

[Install]
WantedBy=default.target
SERVICE

print "Reloading user systemd units..."
systemctl --user daemon-reload

print "Enabling $service_name for login autostart..."
systemctl --user enable "$service_name"

print "Restarting $service_name..."
systemctl --user reset-failed "$service_name" >/dev/null 2>&1 || true
systemctl --user restart "$service_name"

print "Service installed, enabled, and restarted."
print "Enabled state: $(systemctl --user is-enabled "$service_name")"
print "Active state: $(systemctl --user is-active "$service_name")"
print "View logs with:"
print "  journalctl --user -u $service_name -f"
