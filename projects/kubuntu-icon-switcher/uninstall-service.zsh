#!/usr/bin/env zsh
set -euo pipefail

service_name="kubuntu-icon-switcher.service"
config_home="${XDG_CONFIG_HOME:-$HOME/.config}"
service_directory="$config_home/systemd/user"
service_path="$service_directory/$service_name"
app_config_directory="$config_home/kubuntu-icon-switcher"
environment_path="$app_config_directory/service.env"
native_manifest_path="$HOME/.mozilla/native-messaging-hosts/codex_kubuntu_icon_switcher.json"
native_manifest_dir="$(dirname "$native_manifest_path")"

if ! command -v systemctl >/dev/null 2>&1; then
  print -u2 "systemctl was not found on PATH."
  exit 1
fi

print "Stopping and disabling user systemd service..."
systemctl --user stop "$service_name" >/dev/null 2>&1 || true
systemctl --user disable "$service_name" >/dev/null 2>&1 || true
systemctl --user reset-failed "$service_name" >/dev/null 2>&1 || true

if [[ -f "$service_path" ]]; then
  print "Removing service file: $service_path"
  rm -f "$service_path"
else
  print "Service file not found: $service_path"
fi

if [[ -f "$environment_path" ]]; then
  print "Removing environment file: $environment_path"
  rm -f "$environment_path"
else
  print "Environment file not found: $environment_path"
fi

if [[ -d "$app_config_directory" ]]; then
  if rmdir "$app_config_directory" >/dev/null 2>&1; then
    print "Removed empty directory: $app_config_directory"
  else
    print "Kept directory because it is not empty: $app_config_directory"
  fi
fi

if [[ -f "$native_manifest_path" ]]; then
  print "Removing Firefox native messaging host manifest: $native_manifest_path"
  rm -f "$native_manifest_path"
else
  print "Native messaging host manifest not found: $native_manifest_path"
fi

if [[ -d "$native_manifest_dir" ]]; then
  if rmdir "$native_manifest_dir" >/dev/null 2>&1; then
    print "Removed empty directory: $native_manifest_dir"
  fi
fi

print "Reloading user systemd units..."
systemctl --user daemon-reload
print "Uninstall complete."
