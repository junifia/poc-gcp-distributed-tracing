import { Application, Router } from "https://deno.land/x/oak/mod.ts";
import { Logging } from "npm:@google-cloud/logging";
import { CloudTasksClient } from "npm:@google-cloud/tasks";
import { encode } from "https://deno.land/std@0.197.0/encoding/base64.ts";

const app = new Application();
const port = +(Deno.env.get("PORT") || 8000);

const logging = new Logging();
await logging.setProjectId();
await logging.setDetectedResource();

const tasksClient = new CloudTasksClient();

const router = new Router();
router
  .get("/", (context) => {
    context.response.body = ["Hello world!"];
  })
  .post("/tasks", async (context) => {
    const host = context.request.headers.get("host");
    const location: string = logging.detectedResource?.labels?.location;
    if (location) {
      const serviceAccountEmail = await fetch(
        "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/email",
        { headers: { "Metadata-Flavor": "Google" } }
      )
        .then((r) => r.json())
        .catch((e) => console.log(e));
      console.log(serviceAccountEmail);
      console.log(
        tasksClient.queuePath(logging.projectId, location, "poc-tasks")
      );

      try {
        const task = await tasksClient.createTask({
          parent: tasksClient.queuePath(
            logging.projectId,
            location,
            "poc-tasks"
          ),
          task: {
            httpRequest: {
              httpMethod: "POST",
              url: `https://${host}/logs`,
              body: encode(JSON.stringify({})),
              headers: {
                "Content-Type": "application/json",
                traceparent: context.request.headers.get("traceparent") || "",
              },
              // oidcToken: { serviceAccountEmail },
            },
          },
        });
      } catch (e) {
        console.log(e);
      }

      context.response.body = task;
    } else {
      console.log("skipped task creation");
    }
  })
  .post("/logs", async (context) => {
    context.response.body = await context.request.body().value;
  });

app.use(async (context, next) => {
  await next();

  const traceHeader = context.request.headers.get("X-Cloud-Trace-Context");
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

  const { authorization, ...headers } = Object.fromEntries(
    context.request.headers.entries()
  );
  const log = logging.logSync("stdout");
  log.info(
    log.entry(
      {
        labels: { a: "42" },
        spanId,
        trace: `projects/${logging.projectId}/traces/${traceId}`,
        traceSampled: true,
      },
      {
        traceparent: context.request.headers.get("traceparent"),
        headers,
      }
    )
  );
});

app.use(router.routes());
app.use(router.allowedMethods());

await app.listen({ port });
