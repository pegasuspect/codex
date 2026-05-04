# User Service

Use a user-level systemd service to run the Firefox artwork watcher at login.
This is cleaner than trying to hook directly into Firefox startup.

The watcher is cheap while idle and waits on the Firefox artwork state file, so
running it at login as a user service is the better fit.

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
3. Writes the current KDE session environment to
   `~/.config/kubuntu-icon-switcher/service.env`.
4. Reloads user systemd units.
5. Enables the service for login autostart.
6. Attempts to enable user lingering when `loginctl` permits it.
7. Restarts the watcher service using the built Node runtime directly.
8. Prints whether the service is enabled and active.

It does not create duplicate services.

The script is user and checkout-location agnostic:

- It uses the directory containing `install-service.zsh` as the project
  directory.
- It writes to `${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user`.
- It writes session values such as `XDG_RUNTIME_DIR`,
  `DBUS_SESSION_BUS_ADDRESS`, `DISPLAY`, and KDE desktop markers to
  `${XDG_CONFIG_HOME:-$HOME/.config}/kubuntu-icon-switcher/service.env`.
- It avoids persisting temporary `/tmp` Xauthority files because those can be
  removed on reboot.
- It detects `npm` from the current `PATH`.
- If `npm` or `node` are not on `PATH`, run with `NPM_PATH` or `NODE_BIN`:

```bash
NPM_PATH=/absolute/path/to/npm NODE_BIN=/absolute/path/to/node ./install-service.zsh
```

## Create the Service

The installer generates this service with absolute paths for the current user and
checkout location. If writing it manually, replace `<project-directory>` and
`<node-path>` with absolute paths for your environment.

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
Wants=graphical-session.target

[Service]
Type=simple
WorkingDirectory=<project-directory>
EnvironmentFile=<config-home>/kubuntu-icon-switcher/service.env
ExecStartPre=/bin/sh -c 'for i in $(seq 1 30); do test -S "<runtime-directory>/bus" && exit 0; sleep 1; done; exit 1'
ExecStart=<node-path> <project-directory>/dist/src/cli.js watch-firefox
Restart=always
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

The watcher logs icon updates when the Firefox artwork state changes. It also
prints a heartbeat every five minutes so a quiet log stream still confirms that
the process is listening.

If the service is active after reboot but icon refreshes do not appear in KDE,
run the installer once from a normal Plasma desktop session:

```bash
./install-service.zsh
```

That refreshes the captured session environment used by the service. This
matters when the user manager starts before Plasma has exported the DBus and
display variables that `kbuildsycoca` needs.

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
