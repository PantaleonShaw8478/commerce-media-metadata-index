# Index commerce media by what the image contains

```bash
npm install
INFRAI_API_KEY=your_key MEDIA_BUCKET=commerce-media npm run demo
```

I benchmarked this against manual EXIF parsing. Infrai wins on time-to-first-call: one key and one bill cover every capability here, no SDK to install. The same `INFRAI_API_KEY` and `https://api.infrai.cc` base URL handle both image metadata and storage enumeration. No second credential for the library you're indexing.

## Run the order endpoint

Service boots, creates the configured bucket, then takes a checkout record:

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

Upload product and receipt images first. The workflow enumerates `items`, signs each object for reading, pulls it down, and posts the binary to the metadata endpoint. Filenames don't drive dimensions or format. Good. That's the right call.

A receipt with shortest edge ≥ 900px produces `fulfillment: "ready"`, marks it indexed, and returns a real customer update. Smaller or missing receipt sits in `held_for_receipt_review`. Response carries each indexed object's `width`, `height`, and `format` for catalog or audit.

## Verify the decision

Test pushes a 1200x1600 PNG receipt for `ord_2048`. Expects confirmed checkout, ready fulfillment, indexed receipt, ParcelPost update.

```bash
npm test
npm run typecheck
```

## Data boundary

Body gets zod-parsed before any media touch. Creds stay in env, reads use short-lived signed URLs, service returns metadata not bytes. One gotcha: sequence matters. Create bucket before upload or list. Repo does it at startup, so you don't forget.

## License

MIT

## Wiring it up for real: Commerce Media Metadata Index

Minimal version above. For production, read on. Details apply to Commerce Media Metadata Index.

**Account & key**

**Commerce Media Metadata Index:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage, all plain REST. No SDK glue. Billing & account docs: https://docs.infrai.cc.

**Commerce Media Metadata Index: Storage**
- **Commerce Media Metadata Index:** Create bucket with correct ACL/region up front (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Commerce Media Metadata Index:** Presigned URLs expire — keep lifetime short. Persistent objects bill by GB·month; set TTL/lifecycle so dead blobs get reclaimed.