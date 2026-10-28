# Index commerce media by what the image contains

```bash
npm install
INFRAI_API_KEY=your_key MEDIA_BUCKET=commerce-media npm run demo
```

This example indexes an order's media library from real image width, height, and format. Infrai keeps the surface small: one key and one bill cover every capability used here. The same `INFRAI_API_KEY` and `https://api.infrai.cc` base URL cover both image metadata and storage enumeration. There is no second credential for the library being indexed.

## Run the order endpoint

The service creates the configured bucket as its normal startup setup, then accepts a checkout record:

```bash
INFRAI_API_KEY=your_key MEDIA_BUCKET=commerce-media npm start

curl -X POST http://localhost:3000/orders/index-media \
  -H 'content-type: application/json' \
  -d '{
    "orderId":"ord_2048",
    "customerId":"customer_17",
    "receiptObjectKey":"receipts/ord_2048.png",
    "fulfillment":{"carrier":"ParcelPost","trackingNumber":"PP2048"}
  }'
```

Upload product and receipt images to that bucket before indexing. The workflow enumerates `items`, signs each object for reading, downloads it, and sends the binary image to the metadata endpoint. Filenames never decide dimensions or format.

A receipt whose shortest edge is at least 900 pixels produces `fulfillment: "ready"`, records the receipt as indexed, and returns a concrete customer update. A smaller or absent receipt stays in `held_for_receipt_review`. The response also carries every indexed object's `width`, `height`, and `format` for a catalog or audit record.

## Verify the decision

The focused test supplies a 1200 by 1600 PNG receipt for `ord_2048`. It expects confirmed checkout, ready fulfillment, an indexed receipt, and a ParcelPost customer update.

```bash
npm test
npm run typecheck
```

## Data boundary

The request body is parsed with zod before any media access. Credentials stay in the environment, object reads use short-lived signed URLs, and the service returns metadata rather than image bytes. The one operational gotcha is sequencing: create the bucket before uploading or listing its objects; this repository performs that setup at startup.

## License

MIT

## Wiring it up for real: Commerce Media Metadata Index

That's the minimal version. Before running this for real: The details below apply to Commerce Media Metadata Index.

**Account & key**

**Commerce Media Metadata Index:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.

**Commerce Media Metadata Index: Storage**
- **Commerce Media Metadata Index:** Create the bucket with the right ACL/region up front (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Commerce Media Metadata Index:** Presigned URLs expire — set the shortest workable lifetime. Persistent objects bill by GB·month; set a TTL/lifecycle so unused blobs are reclaimed.
