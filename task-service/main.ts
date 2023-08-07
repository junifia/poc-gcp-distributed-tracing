import { Application, Router } from "https://deno.land/x/oak/mod.ts";
import { Logging } from "npm:@google-cloud/logging";

const app = new Application();
const port = +(Deno.env.get("PORT") || 8000);

const logging = new Logging();
await logging.setProjectId();
await logging.setDetectedResource();

const router = new Router();
router
  .get("/", (context) => {
    context.response.body = ["Hello world!"];
  })
  .post("/logs", async (context) => {
    const body = await context.request.body().value;
    context.response.body = body;

    const traceHeader = context.request.headers.get("X-Cloud-Trace-Context");
    const [trace] = traceHeader?.split("/") || [];

    const meta = {
      ...body,
      labels: { a: 42 },
      "logging.googleapis.com/trace": `projects/${logging.projectId}/traces/${trace}`,
    };

    const log = logging.logSync("process.stdout");
    console.log(JSON.stringify({ ...meta, message: "with trace 2" }));
    log.info(log.entry({}, "with trace"));
  })
  .post("/links", async (context) => {
    context.response.body = await context.request.body().value;
    console.log(context.response.body);
  });

app.use(router.routes());
app.use(router.allowedMethods());

await app.listen({ port });
