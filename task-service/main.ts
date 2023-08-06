import { Application, Router } from "https://deno.land/x/oak/mod.ts";

const app = new Application();
const port = +(Deno.env.get("PORT") || 8000);

const router = new Router();
router
  .get("/", (context) => {
    context.response.body = ["Hello world!"];
  })
  .post("/logs", async (context) => {
    context.response.body = await context.request.body().value;
    console.log(context.response.body);
  })
  .post("/links", async (context) => {
    context.response.body = await context.request.body().value;
    console.log(context.response.body);
  });


app.use(router.routes());
app.use(router.allowedMethods());

await app.listen({ port });
