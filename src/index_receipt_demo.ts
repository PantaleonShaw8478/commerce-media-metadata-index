import { mediaClientFromEnvironment } from "./infrai_media_client.js";
import { indexOrderMedia } from "./order_media_index.js";

const bucket = process.env.MEDIA_BUCKET ?? "commerce-media";
const client = mediaClientFromEnvironment();
await client.createBucket(bucket);

try {
  const result = await indexOrderMedia({
    orderId: "ord_2048",
    customerId: "customer_17",
    receiptObjectKey: "receipts/ord_2048.png",
    fulfillment: { carrier: "ParcelPost", trackingNumber: "PP2048" },
  }, bucket, client);

  console.log(JSON.stringify(result, null, 2));
} finally {
  await client.deleteBucket(bucket);
}
