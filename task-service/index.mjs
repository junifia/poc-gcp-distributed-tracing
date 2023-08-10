import express from "express";
import { Logging } from "@google-cloud/logging";
import { TraceExporter } from "@google-cloud/opentelemetry-cloud-trace-exporter";
import { CloudTasksClient } from "@google-cloud/tasks";

const app = express();
app.use(express.json());
const port = +process.env.PORT || 3000;

const logging = new Logging();
await logging.setProjectId();
await logging.setDetectedResource();

const tasksClient = new CloudTasksClient();

app.use((request, res, next) => {
  next();

  const traceHeader = request.get("X-Cloud-Trace-Context");
  const [traceId, spanId] =
    traceHeader?.split("/").flatMap((id) => id.split(";")) || [];

  // alternative with structured logging
  // const metadata = {
  //   "logging.googleapis.com/labels": { a: 42 },
  //   "logging.googleapis.com/spanId": spanId,
  //   "logging.googleapis.com/trace": `projects/${logging.projectId}/traces/${traceId}`,
  //   "logging.googleapis.com/trace_sampled": true,
  // };
  // console.log(JSON.stringify({ ...metadata, message: "with structured log" }));

  const { authorization, ...headers } = request.headers;
  const log = logging.logSync("stdout");
  log.useMessageField_;
  log.info(
    log.entry(
      {
        labels: { a: "42" },
        spanId,
        trace: `projects/${logging.projectId}/traces/${traceId}`,
        traceSampled: true
      },
      {
        traceparent: request.get("traceparent"),
        headers,
      }
    )
  );
});

app.get("/", (req, res) => {
  res.send();
});

app.post("/tasks", async (request, res) => {
  const host = request.get("host");
  const location = logging.detectedResource?.labels?.location;

  if (location) {
    const serviceAccountEmail = await fetch(
      "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/email",
      { headers: { "Metadata-Flavor": "Google" } }
    ).then((r) => r.text());

    const results = await tasksClient.createTask({
      parent: tasksClient.queuePath(logging.projectId, location, "poc-tasks"),
      task: {
        httpRequest: {
          httpMethod: "POST",
          url: `https://${host}/logs`,
          body: Buffer.from(JSON.stringify({})).toString("base64"),
          headers: {
            "Content-Type": "application/json",
            traceparent: request.get("traceparent") || "",
          },
          oidcToken: { serviceAccountEmail },
        },
      },
    });

    res.send(results);
  } else {
    console.log("skipped task creation");
  }
});

app.post("/logs", (req, res) => {
  res.send(req.body);
});

app.use((err, req, res, next) => {
  try {
    next();
  } catch (e) {
    console.log(e);
  }
});

app.listen(port, () => {});
