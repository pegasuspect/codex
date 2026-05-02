# User Service

Use a user-level systemd service to run the Firefox artwork watcher at login.
This is cleaner than trying to hook directly into Firefox startup.

The watcher is cheap while idle and waits on the Firefox artwork state file, so
running it at login as a user service is the better fit.

## Prerequisite

Before enabling the service, make sure the Firefox native messaging host is
installed:

```bash
cd /home/pegasuspect/projects/codex/projects/kubuntu-icon-switcher
npm run install-firefox-host
```

## Install or Repair with Script

The project includes an installer script that installs the native host, writes
the user-level systemd service, reloads systemd, enables autostart, and restarts
the watcher:

```bash
./install-service.zsh
```

The script is safe to run again. Each run:

1. Rebuilds and installs the Firefox native messaging host.
2. Rewrites the same service file at
   `~/.config/systemd/user/kubuntu-icon-switcher.service`.
3. Reloads user systemd units.
4. Enables the service for login autostart.
5. Restarts the watcher service.
6. Prints whether the service is enabled and active.

It does not create duplicate services.

## Create the Service

Create the user systemd directory and service file:

```bash
mkdir -p ~/.config/systemd/user
nano ~/.config/systemd/user/kubuntu-icon-switcher.service
```

Paste this service definition:

```ini
[Unit]
Description=Kubuntu Icon Switcher Firefox artwork watcher
After=graphical-session.target

[Service]
Type=simple
WorkingDirectory=/home/pegasuspect/projects/codex/projects/kubuntu-icon-switcher
ExecStart=/usr/bin/npm run watch-firefox
Restart=on-failure
RestartSec=3

[Install]
WantedBy=default.target
```

## Enable and Start

```bash
systemctl --user daemon-reload
systemctl --user enable kubuntu-icon-switcher.service
systemctl --user restart kubuntu-icon-switcher.service
```

## Check Logs

```bash
journalctl --user -u kubuntu-icon-switcher.service -f
```

## Stop

```bash
systemctl --user stop kubuntu-icon-switcher.service
```

## Disable Autostart

```bash
systemctl --user disable kubuntu-icon-switcher.service
```

## Notes

Tying the watcher to Firefox specifically is possible with a wrapper script, but
it is brittle. A login-started user service is simpler and matches the watcher's
behavior: it waits for the Firefox bridge state file and reacts when Spotify Web
Player sends artwork updates.
