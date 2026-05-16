export type TaskState = "wanted" | "started" | "held" | "done" | "removed";

export type Task = {
  id: string;
  title: string;
  state: TaskState;
  holdReason?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

export type Event =
  | { type: "task.added"; id: string; title: string; tags: string[]; at: string }
  | { type: "task.started"; id: string; at: string }
  | { type: "task.held"; id: string; at: string; reason?: string }
  | { type: "task.done"; id: string; at: string }
  | { type: "task.dropped"; id: string; at: string }
  | { type: "task.purged"; id: string; at: string };

export type Outcome = {
  code: number;
  text: string;
};
