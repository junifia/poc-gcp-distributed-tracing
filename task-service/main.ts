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
    const a = await context.request.body().value;
    context.response.body = a;
    console.log({ a: 1, ...a });

    const log = logging.logSync("stdout");
    const meta = { labels: { port: String(port) } };
    const entry = log.entry(meta, "Your log message");
    log.info(entry);
  })
  .post("/links", async (context) => {
    context.response.body = await context.request.body().value;
    console.log(context.response.body);
  });

app.use(router.routes());
app.use(router.allowedMethods());

await app.listen({ port });
