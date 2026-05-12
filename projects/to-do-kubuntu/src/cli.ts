#!/usr/bin/env node
import { requireKubuntu } from "./platform";
import { runTaskCommand } from "./tasks";
import { openUi } from "./ui";

const write = (text: string, error = false) => {
  (error ? process.stderr : process.stdout).write(`${text}\n`);
};

const main = async () => {
  const blocked = requireKubuntu();
  if (blocked) {
    write(blocked.text, true);
    return blocked.code;
  }

  const args = process.argv.slice(2);
  if (args[0] === "ui") return openUi();

  const outcome = runTaskCommand(args);
  write(outcome.text, outcome.code > 0);
  return outcome.code;
};

main().then((code) => {
  process.exitCode = code;
});
