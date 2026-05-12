import { existsSync, readFileSync } from "node:fs";
import type { Outcome } from "./model";

type OsRelease = Record<string, string>;

const osReleasePath = () =>
  process.env.TODOCTL_OS_RELEASE ?? "/etc/os-release";

const clean = (value: string) => value.replace(/^"|"$/g, "").toLowerCase();

const readOsRelease = (): OsRelease => {
  const path = osReleasePath();
  if (!existsSync(path)) return {};

  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split("\n")
      .map((line) => line.split("=", 2))
      .filter(([key, value]) => key && value)
      .map(([key, value]) => [key, clean(value)]),
  );
};

export const isKubuntu = (): boolean => {
  if (process.env.TODOCTL_ASSUME_KUBUNTU === "1") return true;

  const os = readOsRelease();
  const desktop = (process.env.XDG_CURRENT_DESKTOP ?? "").toLowerCase();
  const session = (process.env.DESKTOP_SESSION ?? "").toLowerCase();
  const distro = [os.ID, os.ID_LIKE, os.VARIANT_ID, os.NAME].join(" ");

  const plasma = desktop.includes("kde") || session.includes("kde") || session.includes("plasma");
  return distro.includes("kubuntu") || (distro.includes("ubuntu") && plasma);
};

export const requireKubuntu = (): Outcome | undefined => {
  if (isKubuntu()) return undefined;

  return {
    code: 1,
    text: "todoctl: Kubuntu with KDE Plasma is required. This system does not look like Kubuntu.",
  };
};
