const express = require("express");
const { inngest } = require("../inngest/client");

const router = express.Router();

// Temporary in-memory workflow store
const workflowRuns = new Map();

router.post("/run", async (req, res) => {
  try {
    const {
      nodes,
      edges,
      startNodeId,
      userMessage,
    } = req.body;

    if (!nodes || !edges || !startNodeId) {
      return res.status(400).json({
        error:
          "nodes, edges and startNodeId are required",
      });
    }

    if (!userMessage || !userMessage.trim()) {
      return res.status(400).json({
        error: "userMessage is required",
      });
    }

    const runId = `run-${Date.now()}`;

    // Initial status
    workflowRuns.set(runId, {
      runId,
      status: "running",
      userMessage: userMessage.trim(),
      execution: [],
    });

    await inngest.send({
      name: "workflow/run",

      data: {
        runId,
        nodes,
        edges,
        startNodeId,
        userMessage: userMessage.trim(),
      },
    });

    return res.status(202).json({
      success: true,
      runId,
      message: "Workflow execution started",
    });
  } catch (error) {
    console.error("Workflow error:", error);

    return res.status(500).json({
      error: "Failed to start workflow",
    });
  }
});

// Get workflow status
router.get("/runs/:runId", (req, res) => {
  const run = workflowRuns.get(req.params.runId);

  if (!run) {
    return res.status(404).json({
      error: "Workflow run not found",
    });
  }

  return res.json(run);
});

// Function used by Inngest to update status
router.workflowRuns = workflowRuns;

module.exports = router;