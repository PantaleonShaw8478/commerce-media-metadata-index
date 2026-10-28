import { z } from "zod";
import type { ImageMetadata, LibraryObject } from "./infrai_media_client.js";

export const orderIndexRequestSchema = z.object({
  orderId: z.string().min(1).max(80),
  customerId: z.string().min(1).max(80),
  receiptObjectKey: z.string().min(1),
  fulfillment: z.object({
    carrier: z.string().min(1),
    trackingNumber: z.string().min(1),
  }),
});

export type OrderIndexRequest = z.infer<typeof orderIndexRequestSchema>;
export type IndexedMedia = LibraryObject & ImageMetadata;
export type OrderMediaResult = {
  orderId: string;
  checkout: "confirmed";
  fulfillment: "ready" | "held_for_receipt_review";
  receipt: { objectKey: string; indexed: boolean };
  customerUpdate: string;
  media: IndexedMedia[];
};

export interface MediaLibrary {
  listObjects(bucket: string): Promise<LibraryObject[]>;
  imageMetadata(bucket: string, key: string): Promise<ImageMetadata>;
}

const MIN_RECEIPT_EDGE = 900;

export async function indexOrderMedia(
  input: OrderIndexRequest,
  bucket: string,
  library: MediaLibrary,
): Promise<OrderMediaResult> {
  const objects = await library.listObjects(bucket);
  const media = await Promise.all(objects.map(async (object) => ({
    ...object,
    ...await library.imageMetadata(bucket, object.key),
  })));
  const receipt = media.find((item) => item.key === input.receiptObjectKey);
  const receiptReady = Boolean(
    receipt && Math.min(receipt.width, receipt.height) >= MIN_RECEIPT_EDGE,
  );
  const fulfillment = receiptReady ? "ready" : "held_for_receipt_review";

  return {
    orderId: input.orderId,
    checkout: "confirmed",
    fulfillment,
    receipt: { objectKey: input.receiptObjectKey, indexed: receiptReady },
    customerUpdate: receiptReady
      ? `Order ${input.orderId} is ready for ${input.fulfillment.carrier} fulfillment.`
      : `Order ${input.orderId} receipt is queued for review.`,
    media,
  };
}
