import { createServer } from "node:http";
import { ZodError } from "zod";
import { InfraiError, mediaClientFromEnvironment } from "./infrai_media_client.js";
import { indexOrderMedia, orderIndexRequestSchema } from "./order_media_index.js";

const bucket = process.env.MEDIA_BUCKET ?? "commerce-media";
const port = Number(process.env.PORT ?? 3000);
const client = mediaClientFromEnvironment();

async function readJson(request: AsyncIterable<Uint8Array>): Promise<unknown> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of request) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function statusFor(error: unknown): number {
  if (error instanceof ZodError || error instanceof SyntaxError) return 400;
  if (error instanceof InfraiError && error.status >= 400 && error.status < 500) return error.status;
  return 500;
}

await client.createBucket(bucket);

const server = createServer(async (request, response) => {
  response.setHeader("Content-Type", "application/json");
  if (request.method !== "POST" || request.url !== "/orders/index-media") {
    response.writeHead(404).end(JSON.stringify({ error: "Route not found" }));
    return;
  }
  try {
    const input = orderIndexRequestSchema.parse(await readJson(request));
    const result = await indexOrderMedia(input, bucket, client);
    response.writeHead(200).end(JSON.stringify(result));
  } catch (error) {
    response.writeHead(statusFor(error)).end(JSON.stringify({
      error: error instanceof Error ? error.message : "Request failed",
    }));
  }
});

server.listen(port, () => {
  console.log(`Order media service listening on http://localhost:${port}`);
});
