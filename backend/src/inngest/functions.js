const { inngest } = require("./client");
const { askDecision } = require("../services/aiDecision");

const workflowRuns = require("../routes/workflowRoutes").workflowRuns;

const runWorkflow = inngest.createFunction(
  {
    id: "run-ai-decision-workflow",

    triggers: [
      {
        event: "workflow/run",
      },
    ],
  },

  async ({ event, step }) => {
    const {
      runId,
      nodes,
      edges,
      startNodeId,
      userMessage,
    } = event.data;

    let currentNodeId = startNodeId;

    const execution = [];

    const visitedNodes = new Set();

    try {
      while (currentNodeId) {
        if (visitedNodes.has(currentNodeId)) {
          throw new Error(
            `Workflow loop detected at node: ${currentNodeId}`
          );
        }

        visitedNodes.add(currentNodeId);

        const node = nodes.find(
          (item) => item.id === currentNodeId
        );

        if (!node) {
          throw new Error(
            `Node not found: ${currentNodeId}`
          );
        }

        const decision = await step.run(
          `decision-${node.id}`,
          async () => {
            return await askDecision(
              node.data.prompt,
              userMessage
            );
          }
        );

        const log = {
          nodeId: node.id,
          prompt: node.data.prompt,
          decision,
        };

        execution.push(log);

        // Update frontend-readable status
        const currentRun = workflowRuns.get(runId);

        if (currentRun) {
          workflowRuns.set(runId, {
            ...currentRun,
            status: "running",
            execution: [...execution],
          });
        }

        const nextEdge = edges.find(
          (edge) =>
            edge.source === node.id &&
            edge.sourceHandle ===
              decision.toLowerCase()
        );

        if (!nextEdge) {
          break;
        }

        currentNodeId = nextEdge.target;
      }

      const completedRun = workflowRuns.get(runId);

      if (completedRun) {
        workflowRuns.set(runId, {
          ...completedRun,
          status: "completed",
          execution,
        });
      }

      return {
        runId,
        userMessage,
        execution,
        completed: true,
      };
    } catch (error) {
      console.error(
        "Workflow execution error:",
        error
      );

      const failedRun = workflowRuns.get(runId);

      if (failedRun) {
        workflowRuns.set(runId, {
          ...failedRun,
          status: "failed",
          error: error.message,
          execution,
        });
      }

      throw error;
    }
  }
);

module.exports = {
  inngest,
  functions: [runWorkflow],
};