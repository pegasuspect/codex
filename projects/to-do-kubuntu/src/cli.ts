#!/usr/bin/env node
import { requireKubuntu } from "./platform";
import { runTaskCommand } from "./tasks";

const write = (text: string, error = false) => {
  (error ? process.stderr : process.stdout).write(`${text}\n`);
};

const main = () => {
  const blocked = requireKubuntu();
  if (blocked) {
    write(blocked.text, true);
    return blocked.code;
  }

  const outcome = runTaskCommand(process.argv.slice(2));
  write(outcome.text, outcome.code > 0);
  return outcome.code;
};

process.exitCode = main();
