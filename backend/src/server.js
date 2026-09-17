const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { serve } = require("inngest/express");
const {
  inngest,
  functions,
} = require("./inngest/functions");

const workflowRoutes = require("./routes/workflowRoutes");

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
  })
);

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "BE-09 AI Flow API is running",
  });
});

app.use(
  "/api/workflow",
  workflowRoutes
);

app.use(
  "/api/inngest",
  serve({
    client: inngest,
    functions,
  })
);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(
    `Server running on http://localhost:${PORT}`
  );
});