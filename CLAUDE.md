# CLAUDE.md

## Purpose

This file is the working guide for coding agents (such as Claude Code or Antigravity) in this repository.

It is not a replacement for a product README. Its job is to explain how this codebase is organized, what patterns already exist, and what must be preserved when making changes.

## Project Snapshot

- Backend for a PC hardware ecommerce application.
- Public API is mounted under `/api`.
- Admin API is mounted under `/api/admin`.
- Runtime entrypoint is `src/index.ts`, which calls `createServer()` from `src/server.ts`.
- Swagger UI is exposed at `/api-docs` and the raw spec at `/api-docs.json`.

### Current Stack

- **Runtime**: Node.js + TypeScript with ESM-style imports (`.js` suffix in TS source).
- **Web Server**: Express 5 (leveraging built-in async error capturing).
- **ORM & DB**: Prisma 7 with PostgreSQL via `@prisma/adapter-pg` and standard `@prisma/client`.
- **Cache/State**: Redis for real-time online status and Event Pub/Sub.
- **Storage**: AWS S3 via `@aws-sdk/client-s3` (handling presigned URL generation and file CRUD).
- **Email Delivery**: Resend for verification codes and password resets.
- **Auth**: Custom JWT credentials & Google OAuth via `google-auth-library`.
- **Payment**: PayOS (`@payos/node`) integration for generating checkout links and verifying webhooks.
- **Push & Real-time Notifications**: Firebase Cloud Messaging (FCM) using `firebase-admin` for push, and Server-Sent Events (SSE) using Redis Pub/Sub for live notifications.
- **Shipping**: GHN (Giao Hàng Nhanh) API integration for real-time shipping fee calculation.

## Repo Map

### API Layering

The main pattern is:

`route -> controller -> service`

- `src/api/**/**.route.ts`  
  Route registration, middleware chains, and Swagger JSDoc annotations live here.
- `src/api/**/**.controller.ts`  
  Controllers parse and validate request input, call services, capture responses, and return structured JSON.
- `src/api/**/**.service.ts`  
  Services encapsulate core business logic, validation rules, data manipulation, and database access via Prisma.

There is a mirrored admin structure under `src/api/admin/**`.

### Important Folders

- `src/api`  
  Customer-facing modules: auth, user, category, brand, product, cart, coupon, order, payment, wishlist, notification, return-request.
- `src/api/admin`  
  Administrative modules: user, category, brand, product, variant, product-image, stock, coupon, order, notification, return-request.
- `src/middleware`  
  Authentication, authorization, validation, and centralized error handling middleware (`error.middleware.ts`).
- `src/utils`  
  Shared utilities for database, cache, auth, storage, shipment, payment, and mailing APIs.
- `prisma/schema.prisma`  
  Primary database schema definition.
- `prisma/migrations`  
  Database migration history.

---

## Commands And Workflow

Package scripts defined in `package.json`:

```bash
# Start in development mode (watches typescript files using tsx)
npm run dev

# Compile TypeScript to JavaScript (tsc output in dist)
npm run build

# Start the compiled codebase or run TS files directly
npm start
```

### Database Commands

```bash
# Apply migrations or create a new database migration
npx prisma migrate dev

# Directly push schema changes to DB (for testing/dev prototyping)
npx prisma db push

# Launch Prisma Studio GUI
npx prisma studio
```

### Notes

- `npm run dev` uses `tsx watch src/index.ts`.
- `npm start` uses `ts-node src/index.ts`.
- `npm test` is currently an unconfigured placeholder.
- `prisma.config.ts` points to `prisma/schema.prisma` and sets the seed path to `prisma/seed.ts`.
- `prisma/seed.ts` is currently missing; do not reference database seeding as a working flow unless it is created.

---

## Working Rules

### Preserve existing architecture

- Strictly keep the `route -> controller -> service` separation.
- Keep Express-specific handling (parsing query params, setting SSE headers, cookies, and standard responses) inside controllers.
- Put business rules, database transaction blocks, and external API requests inside services.
- Reuse utilities from `src/utils` instead of duplicating helper functions.

### Centralized Error Handling

- Centralized error handler exists in `src/middleware/error.middleware.ts` and is registered inside `src/server.ts`.
- Make use of `AppError` (imported from `src/utils/appError.ts`) when throwing errors with specific status codes (e.g. `throw new AppError('Message', 400)`).
- Because this project uses Express 5, returning or throwing errors in async routes/handlers will automatically bubble up to `ErrorHandler`. Some older code blocks may still contain manual `try/catch` wrappers returning JSON directly—prefer moving towards `AppError` throwing for new/revised code where appropriate.

### Keep response conventions consistent

API responses should match these standard envelopes:

- Success with data: `{ success: true, data: ... }`
- Success with message: `{ success: true, message: ... }`
- Success with pagination: `{ success: true, data: ..., pagination: { total, page, limit, hasMore } }`
- Error response (automatically shaped by centralized ErrorHandler or legacy manual catches): `{ success: false, message: ... }`

### Update Swagger when endpoints change

- JSDoc Swagger annotations are embedded directly inside route files (`.route.ts`), not in external OpenAPI specs.
- If endpoints are added, modified, renamed, or deprecated, update the route file's JSDoc block in the same commit/PR.

### Be careful with Prisma client usage

- Prisma client is instantiated and exported from `src/utils/prisma.ts`.
- Database models and enums are imported directly from `@prisma/client`.
- DO NOT refer to `src/generated/prisma` as it is not used in runtime code.

### Convert Prisma decimals before returning JSON

Many database fields are defined as `Decimal` in Prisma but need to be returned as `Number` in JSON. Explicitly convert monetary and numeric fields with `Number(...)` before returning them. Affected fields:

- `price`
- `compare_at_price`
- `subtotal`
- `discount_amount`
- `shipping_fee`
- `total`
- `discount_value`
- `refund_amount`

### Keep image and storage handling consistent

- Files are uploaded using Multer's memory storage (`src/utils/multer.ts`).
- Storage is managed on AWS S3 (`src/utils/storage.ts`) via `uploadToStorage`, `deleteFromStorage`, and `getStorageUrl`.
- Database models store the unique **S3 Object Key** (e.g., `user/avatars/...` or `return-requests/...`).
- API mappers should convert stored keys to dynamic, secure presigned URLs using `await getStorageUrl(key)` (expiring in 900 seconds / 15 minutes) before returning them in responses.
- Always delete old/unused object keys from storage using `deleteFromStorage` when replacing or removing assets to prevent orphans.

### Keep user-facing language aligned

- Most user-facing business notifications, validations, and custom errors are written in Vietnamese.
- Unless explicitly directed otherwise, match this language convention for API response messages.

---

## Domain Guide

### Auth

- **Files**: `src/api/auth`, `src/middleware/auth.middleware.ts`, `src/utils/jwt.ts`, `src/utils/email.ts`.
- **Mechanisms**: custom JWT credentials registration/login, email validation code verification, Google OAuth ID token verification via `auth.service.ts`, password resets, and session logouts.
- **Refresh tokens**: Stored in a stateful in-memory `Map` inside `auth.service.ts` rather than in Redis or the database. Treat this as memory-stateful runtime state.

### User profile and addresses

- **Files**: `src/api/user`.
- **Mechanisms**: Fetch/modify profile, upload avatar to AWS S3, and change password.
- **Addresses**: Address CRUD, supporting GHN (Giao Hàng Nhanh) address IDs (`province_id`, `district_id`, `ward_code`) to integrate with shipping fee calculations. Default address logic is handled in the service.

### Wishlist

- **Files**: `src/api/wishlist`.
- **Mechanisms**: Simple CRUD for users to maintain a wishlist of products.

### Catalog

- **Files**: `src/api/category`, `src/api/brand`, `src/api/product`, `src/api/admin/category`, `src/api/admin/brand`, `src/api/admin/product`, `src/api/admin/variant`, `src/api/admin/product-image`.
- **Mechanisms**: Category tree hierarchy, brands listing, product lists, search/filter, and variants configuration. 
- **Keys**: Product and Variant image arrays have ordering/primary status logic (`is_primary`, `sort_order`). Product deletion/modification is blocked if there are active cart items or orders referencing them. Product slugs are processed using `toSlug`.

### Cart

- **Files**: `src/api/cart`.
- **Mechanisms**: Resolved per user automatically. Validates item stock availability and variants constraint before completing mutations.

### Coupons

- **Files**: `src/api/coupon`, `src/api/admin/coupon`.
- **Mechanisms**: Active customer coupon lists, and comprehensive administrative CRUD.

### Orders & Shipping

- **Files**: `src/api/order`, `src/api/admin/order`, `src/utils/shipment.ts`.
- **Mechanisms**: Order checkout, order listing, admin status logs and status transitions.
- **Shipping**: Integrates with GHN API. Shipping fees are calculated dynamically based on user address inputs (`district_id`, `ward_code`) and standard item weight profiles using `getShipmentFee`.
- **Safety**: Changes affecting stock amounts, coupons used count, and order status log creation are performed inside safety-critical transaction (`prisma.$transaction`) blocks.

### Payments

- **Files**: `src/api/payment`, `src/utils/payment.ts`.
- **Mechanisms**: Creates PayOS checkout URLs for bank transfer orders. Verifies Webhook (IPN) callbacks, matches signature, updates `Payments` state, and registers order payment status changes.

### Return Requests

- **Files**: `src/api/return-request`, `src/api/admin/return-request`.
- **Mechanisms**: Allows customers to request returns for delivered orders, specifying item condition (`good`, `damaged`, `wrong_item`) and uploading reference images to AWS S3. Admins review return requests, approving or rejecting them, which can trigger corresponding inventory adjustments.

### Notifications

- **Files**: `src/api/notification`, `src/api/admin/notification`, `src/utils/notification.ts`, `src/utils/firebase.ts`.
- **Mechanisms**:
  - **Online Users**: Receive real-time SSE notifications streamed via Redis Pub/Sub channels (`notifications:${userId}`). Online presence is tracked in Redis via keys `markAsOnline:${userId}` with active TTL refreshes.
  - **Offline Users**: Fallback to push notifications sent using Firebase Cloud Messaging (FCM) multicast pushes (`firebaseMessaging`). Failed/stale device tokens are automatically garbage-collected and deleted from the database.

---

## Integration Notes

### PostgreSQL & Prisma

- Active client configuration in `src/utils/prisma.ts` uses `@prisma/adapter-pg`.
- Ensure schema adjustments in `prisma/schema.prisma` have valid migrations.

### Redis

- Used for pub/sub (SSE event loops) and key value lookups (online users tracker).
- Connected during initialization in `src/server.ts`.

### Resend Email

- Configuration in `src/utils/email.ts`.
- Outgoing registration/forgot password links dynamically use configured environment URLs.

### Google OAuth

- Backend client verifies token signatures from client credentials.

### PayOS

- Set up credentials in `.env` to create payment requests and verify webhook request checksums.

### AWS S3

- Region, buckets, and secret key tokens must be properly set up in `.env` for storage methods to operate correctly.

---

## High-Risk Change Checklist

### If you modify or add endpoints
- Always update route definitions, controller mapping, service handling, and the inline Swagger JSDoc.
- Preserve customer and administrator authentication guards.
- Match standard response shapes and return values.

### If you adjust database schema
- Apply migrations or update schema safely.
- Review impacts on numeric/monetary fields (convert with `Number(...)`).
- Check relation deletes/cascades on dependent models.

### If you alter files/storage logic
- Verify the model stores only the S3 object key.
- Verify return structures generate temporary presigned URLs (`getStorageUrl`).
- Ensure S3 object cleanup on item deletion or update.

### If you change notification behavior
- Validate SSE streams aren't blocked.
- Ensure fallback FCM triggers correctly for offline clients.
- Clean up invalid FCM tokens correctly on failure to prevent DB bloat.

---

## Known Gaps And Gotchas

- **Legacy Exception Handling**: Centralized error middleware exists, but several older controllers still use standard `try/catch` and return manually formatted error responses rather than bubbling `AppError` instances. Keep consistency inside the module you are changing.
- **Seeding Missing**: Seed execution is configured on Prisma but `prisma/seed.ts` is absent. Do not run Prisma seed commands.
- **Test Suite**: No active automated test cases exist under `npm test`.

---

## Default Expectation

When making edits, choose simple, localized changes that honor current file boundaries and paradigms instead of introducing custom architectures for a single module.
