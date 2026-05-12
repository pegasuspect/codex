import readline from "node:readline";
import { formatTasks, fold, runTaskCommand } from "./tasks";
import { loadEvents } from "./store";

const screen = () => {
  process.stdout.write("\x1Bc");
  process.stdout.write("To-Do Kubuntu - todoctl UI\n");
  process.stdout.write("Commands match CLI: add, list, start, hold, done, drop, purge, quit\n\n");
  process.stdout.write(`${formatTasks(fold(loadEvents()))}\n\n`);
};

export const openUi = (): Promise<number> =>
  new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    const prompt = () => {
      screen();
      rl.question("todoctl> ", (line) => {
        const args = line.trim().split(/\s+/).filter(Boolean);
        if (!args.length) return prompt();
        if (args[0] === "quit" || args[0] === "q") {
          rl.close();
          resolve(0);
          return;
        }

        const outcome = runTaskCommand(args);
        screen();
        process.stdout.write(`${outcome.text}\n\n`);
        if (outcome.code) process.stdout.write("Press Enter to continue.");
        rl.question("", prompt);
      });
    };

    prompt();
  });
