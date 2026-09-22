import * as fs from "node:fs";
import * as path from "node:path";
import { WORKDIR } from "./config.ts";
import { MARKS, type TodoStatus as TaskStatus } from "./todo.ts";

export type { TaskStatus };

export type Task = {
  id: number;
  subject: string;
  description: string;
  status: TaskStatus;
  blockedBy: number[];
  owner: string;
};

const TASK_FILE_PREFIX = "task_";
const TASK_FILE_EXT = ".json";
const TASK_DIR = path.join(WORKDIR, ".tasks");

/* Helpers */

/** return the full path to a task file */
const taskFilePath = (id: number): string =>
  path.join(TASK_DIR, `${TASK_FILE_PREFIX}${id}${TASK_FILE_EXT}`);

/** return a task from a file */
const readTaskFile = (id: number): Task => {
  try {
    return JSON.parse(fs.readFileSync(taskFilePath(id), "utf8"));
  } catch (error) {
    throw new Error(`Failed to read task file ${taskFilePath(id)}: ${error}`);
  }
};

/** write a task to a file */
const writeTaskFile = (id: number, task: Task): void =>
  fs.writeFileSync(taskFilePath(id), JSON.stringify(task, null, 2));

/** validate a task file name */
const validTaskFileName = (fileName: string): boolean =>
  fileName.startsWith(TASK_FILE_PREFIX) && fileName.endsWith(TASK_FILE_EXT);

/** return the last task id */
const lastTaskID = (): number => {
  const entries = scanTaskFiles();
  return entries.at(-1) ?? 0;
};

/** return the task id from a file name */
const idFromFileName = (fileName: string): number | null => {
  const id = parseInt(
    fileName.slice(TASK_FILE_PREFIX.length, -TASK_FILE_EXT.length),
    10,
  );
  return Number.isNaN(id) ? null : id;
};

/** return a task label */
const taskLabel = (t: Task, b: string = ""): string =>
  `${MARKS[t.status]} #${t.id}: ${t.subject}${b}`;

/** scan task files */
const scanTaskFiles = (dir: string = TASK_DIR): number[] =>
  fs
    .readdirSync(dir)
    .filter(validTaskFileName)
    .map((f) => idFromFileName(f))
    .filter((entry): entry is number => entry !== null)
    .sort((a, b) => a - b);

/* End Helpers */

export class TaskManager {
  /** constructor */
  constructor() {
    fs.mkdirSync(TASK_DIR, { recursive: true });
  }

  /** create a new task */
  create(subject: string, description = "") {
    const t: Task = {
      id: lastTaskID() + 1,
      subject,
      description,
      status: "pending",
      blockedBy: [],
      owner: "",
    };
    writeTaskFile(t.id, t);
    return JSON.stringify(t, null, 2);
  }

  /** get a task */
  get(id: number): string {
    return JSON.stringify(readTaskFile(id), null, 2);
  }

  /** update a task */
  update(
    id: number,
    status?: TaskStatus,
    add?: number[],
    remove?: number[],
  ): string {
    const t = readTaskFile(id);
    if (status) t.status = status;
    if (status === "completed") this.clearDependency(id);
    if (add) t.blockedBy = [...new Set([...t.blockedBy, ...add])];
    if (remove) t.blockedBy = t.blockedBy.filter((b) => !remove.includes(b));
    writeTaskFile(id, t);
    return JSON.stringify(t, null, 2);
  }

  /** list all tasks */
  list() {
    const entries = scanTaskFiles();
    return entries.length
      ? entries.map((tid) => {
          const t = readTaskFile(tid);
          const b = t.blockedBy.length
            ? ` (blocked by: ${JSON.stringify(t.blockedBy)})`
            : "";
          return taskLabel(t, b);
        })
      : "no tasks";
  }

  /** clear a dependency */
  clearDependency(id: number) {
    for (const tid of scanTaskFiles()) {
      const t = readTaskFile(tid);
      if (t.blockedBy.includes(id)) {
        t.blockedBy = t.blockedBy.filter((b) => b !== id);
        writeTaskFile(tid, t);
      }
    }
  }
}
