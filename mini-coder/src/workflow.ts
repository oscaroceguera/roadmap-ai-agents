// The durable version of runAgent: the SAME loop, with every step checkpointed by DBOS.
import { DBOS } from "@dbos-inc/dbos-sdk";
import { runAgent, type Step } from "./loop";

// The only difference from a plain run: each step's result is saved in Postgres (schema `dbos`).
const checkpoint: Step = (name, fn) => DBOS.runStep(fn, { name });

async function agentWorkflowImpl(task: string) {
  // The workflow ID doubles as the runId, so event_log rows and DBOS's tables share one key.
  return runAgent(task, { runId: DBOS.workflowID!, step: checkpoint });
}

// Registered at import time, on purpose: DBOS must know every workflow BEFORE launch() recovers them.
export const agentWorkflow = DBOS.registerWorkflow(agentWorkflowImpl, {
  name: "agentWorkflow",
});

export async function startDurable() {
  DBOS.setConfig({
    name: "mini-coder",
    systemDatabaseUrl: process.env.DATABASE_URL,
  });

  // this is ALSO recovery: any PENDING workflow restarts from its last completed step
  await DBOS.launch();
}
