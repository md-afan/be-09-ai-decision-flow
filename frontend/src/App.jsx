import { useCallback, useState } from "react";

import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  addEdge,
  useNodesState,
  useEdgesState,
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";
import "./App.css";

/* =========================
   AI DECISION NODE
========================= */

function DecisionNode({ id, data }) {
  return (
    <div className="decision-node">
      {/* Input / Target Handle */}
      <Handle
        type="target"
        position={Position.Left}
      />

      <div className="node-title">
        AI Decision
      </div>

      <textarea
        value={data.prompt}
        onChange={(e) =>
          data.onChange(id, e.target.value)
        }
        placeholder="Enter decision question..."
      />

      <div className="handles">
        {/* YES Handle */}
        <div className="handle-label">
          YES

          <Handle
            type="source"
            position={Position.Right}
            id="yes"
          />
        </div>

        {/* NO Handle */}
        <div className="handle-label">
          NO

          <Handle
            type="source"
            position={Position.Bottom}
            id="no"
          />
        </div>
      </div>
    </div>
  );
}

/* =========================
   INITIAL NODES
========================= */

const initialNodes = [
  {
    id: "start",
    type: "decision",
    position: {
      x: 100,
      y: 150,
    },
    data: {
      prompt: "Is this a support request?",
    },
  },

  {
    id: "support",
    type: "decision",
    position: {
      x: 450,
      y: 80,
    },
    data: {
      prompt: "Is the issue urgent?",
    },
  },

  {
    id: "sales",
    type: "decision",
    position: {
      x: 450,
      y: 280,
    },
    data: {
      prompt: "Is this a sales inquiry?",
    },
  },
];

/* =========================
   INITIAL EDGES
========================= */

const initialEdges = [
  {
    id: "start-support",
    source: "start",
    target: "support",
    sourceHandle: "yes",
    label: "YES",
  },

  {
    id: "start-sales",
    source: "start",
    target: "sales",
    sourceHandle: "no",
    label: "NO",
  },
];

/* =========================
   NODE TYPES
========================= */

const nodeTypes = {
  decision: DecisionNode,
};

/* =========================
   APP
========================= */

function App() {
  const [nodes, setNodes, onNodesChange] =
    useNodesState(initialNodes);

  const [edges, setEdges, onEdgesChange] =
    useEdgesState(initialEdges);

  const [isRunning, setIsRunning] =
    useState(false);

  const [runResult, setRunResult] =
    useState(null);

  const [userMessage, setUserMessage] =
    useState("");
  /* =========================
     UPDATE NODE PROMPT
  ========================= */

  const updatePrompt = useCallback(
    (id, prompt) => {
      setNodes((currentNodes) =>
        currentNodes.map((node) =>
          node.id === id
            ? {
              ...node,
              data: {
                ...node.data,
                prompt,
              },
            }
            : node
        )
      );
    },
    [setNodes]
  );

  /* =========================
     ADD HANDLER TO NODES
  ========================= */

  const nodesWithHandlers = nodes.map(
    (node) => ({
      ...node,

      data: {
        ...node.data,

        onChange: updatePrompt,
      },
    })
  );

  /* =========================
     CONNECT NODES
  ========================= */

  const onConnect = useCallback(
    (connection) => {
      const label =
        connection.sourceHandle === "yes"
          ? "YES"
          : "NO";

      setEdges((currentEdges) =>
        addEdge(
          {
            ...connection,
            label,
          },
          currentEdges
        )
      );
    },
    [setEdges]
  );

  /* =========================
     ADD NEW DECISION NODE
  ========================= */

  const addDecisionNode = () => {
    const id = `node-${Date.now()}`;

    const newNode = {
      id,
      type: "decision",

      position: {
        x: 200,
        y: 450,
      },

      data: {
        prompt:
          "Enter your AI decision question",
      },
    };

    setNodes((currentNodes) => [
      ...currentNodes,
      newNode,
    ]);
  };

  /* =========================
     RUN WORKFLOW
  ========================= */

  const runWorkflow = async () => {
    if (nodes.length === 0) {
      alert("Please add at least one decision node.");
      return;
    }

    if (!userMessage.trim()) {
      alert("Please enter a customer message.");
      return;
    }

    setIsRunning(true);
    setRunResult(null);

    try {
      const response = await fetch(
        "http://localhost:3000/api/workflow/run",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            nodes,
            edges,
            startNodeId: nodes[0]?.id,
            userMessage,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to start workflow"
        );
      }

      setRunResult(data);

      // Check workflow status
      const runId = data.runId;

      const pollStatus = async () => {
        try {
          const statusResponse = await fetch(
            `http://localhost:3000/api/workflow/runs/${runId}`
          );

          const statusData =
            await statusResponse.json();

          setRunResult(statusData);

          if (statusData.status === "running") {
            setTimeout(pollStatus, 1000);
          } else {
            setIsRunning(false);
          }
        } catch (error) {
          console.error(
            "Status polling error:",
            error
          );

          setIsRunning(false);
        }
      };

      setTimeout(pollStatus, 1000);
    } catch (error) {
      console.error(
        "Workflow Error:",
        error
      );

      alert(
        `Workflow failed: ${error.message}`
      );

      setIsRunning(false);
    }
  };

  /* =========================
     UI
  ========================= */

  return (
    <div className="app">

      {/* HEADER */}

      <header className="header">

        <div>
          <h1>
            AI Decision Flow
          </h1>

          <p>
            Build and connect AI-powered
            YES/NO decisions
          </p>
        </div>

        <div className="header-buttons">

          {/* ADD NODE */}

          <button
            className="add-button"
            onClick={addDecisionNode}
          >
            Add Decision
          </button>

          {/* RUN WORKFLOW */}

          <button
            className="run-button"
            onClick={runWorkflow}
            disabled={isRunning}
          >
            {isRunning
              ? "Running..."
              : "Run Workflow"}
          </button>

        </div>
      </header>

      <section className="input-panel">
        <label htmlFor="user-message">
          Test Customer Message
        </label>

        <textarea
          id="user-message"
          value={userMessage}
          onChange={(e) =>
            setUserMessage(e.target.value)
          }
          placeholder="Example: My payment failed and I need help."
        />

        <p>
          This message will be evaluated by each
          AI decision node.
        </p>
      </section>

      {/* WORKFLOW CANVAS */}

      <main className="flow-container">

        <ReactFlow
          nodes={nodesWithHandlers}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
        >

          <Background />

          <Controls />

          <MiniMap />

        </ReactFlow>

      </main>

      {/* RUN RESULT */}

      {runResult?.execution?.length > 0 && (
        <section className="logs-panel">
          <div className="logs-header">
            <h2>Execution Logs</h2>

            <span
              className={`status ${runResult.status}`}
            >
              {runResult.status}
            </span>
          </div>

          <div className="logs-list">
            {runResult.execution.map(
              (log, index) => (
                <div
                  className="log-item"
                  key={`${log.nodeId}-${index}`}
                >
                  <div className="log-number">
                    {index + 1}
                  </div>

                  <div className="log-content">
                    <strong>
                      Node: {log.nodeId}
                    </strong>

                    <p>
                      {log.prompt}
                    </p>

                    <span
                      className={`decision ${log.decision.toLowerCase()}`}
                    >
                      Decision: {log.decision}
                    </span>
                  </div>
                </div>
              )
            )}
          </div>

          {runResult.status === "completed" && (
            <div className="completed-message">
              Workflow Completed
            </div>
          )}
        </section>
      )}

    </div>
  );
}

export default App;