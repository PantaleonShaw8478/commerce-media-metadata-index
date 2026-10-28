import assert from "node:assert/strict";
import test from "node:test";
import { indexOrderMedia, type MediaLibrary } from "../src/order_media_index.js";

test("a legible indexed receipt releases fulfillment and prepares the customer update", async () => {
  const library: MediaLibrary = {
    async listObjects() {
      return [{ key: "products/shoe.webp" }, { key: "receipts/ord_2048.png" }];
    },
    async imageMetadata(_bucket, key) {
      return key.startsWith("receipts/")
        ? { width: 1200, height: 1600, format: "png" }
        : { width: 800, height: 800, format: "webp" };
    },
  };

  const result = await indexOrderMedia({
    orderId: "ord_2048",
    customerId: "customer_17",
    receiptObjectKey: "receipts/ord_2048.png",
    fulfillment: { carrier: "ParcelPost", trackingNumber: "PP2048" },
  }, "commerce-media", library);

  assert.equal(result.checkout, "confirmed");
  assert.equal(result.fulfillment, "ready");
  assert.deepEqual(result.receipt, {
    objectKey: "receipts/ord_2048.png",
    indexed: true,
  });
  assert.match(result.customerUpdate, /ParcelPost fulfillment/);
  assert.equal(result.media[1]?.format, "png");
});
