# CLAUDE.md

## Purpose

This file is the working guide for Claude Code and other coding agents in this repository.

It is not a replacement for a product README. Its job is to explain how this codebase is organized, what patterns already exist, and what must be preserved when making changes.

## Project Snapshot

- Backend for a PC hardware ecommerce application.
- Public API is mounted under `/api`.
- Admin API is mounted under `/api/admin`.
- Runtime entrypoint is `src/index.ts`, which calls `createServer()` from `src/server.ts`.
- Swagger UI is exposed at `/api-docs` and the raw spec at `/api-docs.json`.

### Current stack

- Node.js + TypeScript with ESM-style imports (`.js` suffix in TS source).
- Express 5.
- Prisma 7 with PostgreSQL via `@prisma/adapter-pg`.
- Redis for cache/session-adjacent support.
- Cloudinary for image storage.
- Resend for email delivery.
- Google OAuth via `google-auth-library`.
- MoMo payment integration.
- Swagger JSDoc annotations embedded in route files.

## Repo Map

### API layering

The main pattern is:

`route -> controller -> service`

- `src/api/**/**.route.ts`
  Route registration and Swagger annotations live here.
- `src/api/**/**.controller.ts`
  Controllers parse request input, apply basic validation, call services, and shape JSON responses.
- `src/api/**/**.service.ts`
  Services contain business logic and Prisma access.

There is a mirrored admin structure under `src/api/admin`.

### Important folders

- `src/api`
  Public API modules: auth, user, category, brand, product, cart, coupon, order, payment.
- `src/api/admin`
  Admin API modules: users, categories, brands, products, variants, product images, stock, coupons, orders.
- `src/middleware`
  Auth and request validation helpers. `error.middleware.ts` exists but is currently empty and is not part of a centralized error pipeline.
- `src/utils`
  Shared utilities for Prisma, Redis, JWT, Cloudinary, Multer, email, and slug generation.
- `prisma/schema.prisma`
  Main Prisma schema.
- `prisma/migrations`
  Prisma migration history.
- `src/generated/prisma`
  Committed generated Prisma client used at runtime.

## Commands And Workflow

Package scripts currently defined in `package.json`:

```bash
npm run dev
npm run build
npm start
```

### Notes

- `npm run dev` uses `tsx watch src/index.ts`.
- `npm start` uses `ts-node src/index.ts`.
- `npm test` is not a real test suite right now. The script currently exits with an error.
- `prisma.config.ts` points to `prisma/schema.prisma`, migrations in `prisma/migrations`, and a seed path of `prisma/seed.ts`.
- `prisma/seed.ts` is currently missing, so do not describe seeding as a working repo flow unless that file is added.

## Working Rules For Claude

### Preserve existing architecture

- Keep the `route -> controller -> service` split.
- Put request parsing and HTTP response shaping in controllers.
- Put business rules, transactions, and Prisma calls in services.
- Reuse utilities from `src/utils` instead of duplicating logic.

### Keep routing and auth patterns consistent

- Public routes are mounted in `src/api/index.ts`.
- Admin routes are mounted behind `Authenticate` and `Authorize('admin')` in `src/api/index.ts`.
- Some admin route files still add explicit `Authorize('admin')` on individual handlers. Preserve the current intent instead of removing guards casually.
- Auth middleware stores the decoded JWT payload on `req.user` and also mirrors values to `res.locals`.

### Keep response conventions consistent

Most controllers return JSON in one of these shapes:

- `{ success: true, data: ... }`
- `{ success: true, message: ... }`
- `{ success: true, data: ..., pagination: ... }`
- `{ success: false, message: ... }`

Do not introduce a new response envelope style unless the task explicitly requires it.

### Update Swagger when endpoints change

- Swagger annotations are maintained inside the route files, not in a separate OpenAPI folder.
- If you add, remove, rename, or materially change an endpoint, update the Swagger block in the same route file in the same change.

### Be careful with Prisma client usage

- Runtime Prisma imports come from `src/generated/prisma`, especially in `src/utils/prisma.ts`.
- Do not hand-edit files under `src/generated/prisma`.
- If Prisma generation is changed, preserve the current runtime import contract. Breaking the generated client location or shape can break the app even if `schema.prisma` looks valid.
- Some files import enums or types from `@prisma/client`, while others import from the generated client. Be careful when changing Prisma generation settings.

### Convert Prisma decimals before returning JSON

Many service methods convert Prisma `Decimal` values with `Number(...)` before returning data. Keep doing that for monetary fields such as:

- `price`
- `compare_at_price`
- `subtotal`
- `discount_amount`
- `shipping_fee`
- `total`
- `discount_value`
- `refund_amount`

Do not return raw Prisma Decimal objects in API responses.

### Keep image handling consistent

- Uploads use Multer memory storage from `src/utils/multer.ts`.
- Images are uploaded to Cloudinary from controllers/services.
- The database generally stores Cloudinary `public_id`, not a permanent full URL.
- Response mappers often convert stored image values to URLs with `getCloudinaryImageUrl(...)`.
- When replacing an image, check whether the old stored value is a Cloudinary public ID before deleting it.

### Keep error handling grounded in current behavior

- There is no active centralized error middleware right now.
- Controllers usually wrap service calls in `try/catch` and return `400`, `401`, or `403` directly.
- Do not document or rely on a global error pipeline that does not currently exist.

### Keep user-facing language aligned

- Many business messages and validation errors are written in Vietnamese.
- Unless the task explicitly changes product language, keep new messages aligned with the existing Vietnamese user-facing style.

## Domain Guide

### Auth

Files:

- `src/api/auth`
- `src/middleware/auth.middleware.ts`
- `src/utils/jwt.ts`
- `src/utils/email.ts`

Current behavior:

- Email/password register and login.
- Email verification flow.
- Google login.
- Refresh token flow.
- Forgot password and reset password.
- Authenticated password reset.
- Logout.

Important note:

- Refresh tokens are stored in an in-memory `Map` in `auth.service.ts`, not in Redis or the database. Treat this as session-stateful application behavior.

### User profile and addresses

Files:

- `src/api/user`

Current behavior:

- `/users/me` profile fetch/update.
- Avatar upload and replacement.
- Password change.
- Address CRUD plus default-address management.

Important note:

- Default address behavior is enforced in service logic. Do not move it to the client.

### Catalog

Files:

- `src/api/category`
- `src/api/brand`
- `src/api/product`
- `src/api/admin/category`
- `src/api/admin/brand`
- `src/api/admin/product`
- `src/api/admin/variant`
- `src/api/admin/product-image`

Current behavior:

- Public category tree and category detail.
- Public brand list/detail.
- Public product list, product-by-category, and product detail by slug.
- Admin CRUD for categories, brands, products, variants, and product images.

Important notes:

- Category services build a tree structure in memory.
- Product slugs are derived from names via slug helpers.
- Product and variant image ordering matters (`is_primary`, `sort_order`).
- Product deletion and variant deletion are blocked when related cart/order/review data exists.

### Cart

Files:

- `src/api/cart`

Current behavior:

- Cart is auto-created per user when needed.
- Add, update, remove, and clear cart items.
- Variant availability and stock are checked before cart mutations.

### Coupons

Files:

- `src/api/coupon`
- `src/api/admin/coupon`

Current behavior:

- Public coupon listing returns active coupons only.
- Admin can list, inspect, create, update, delete, and toggle coupon status.

### Orders

Files:

- `src/api/order`
- `src/api/admin/order`

Current behavior:

- Customer order creation, list, detail, cancellation, and confirm-received flow.
- Admin order list, detail, status updates, cancellation, and status log viewing.

Important notes:

- Order creation currently uses request-supplied `items`; it does not automatically convert the whole cart into an order.
- Order creation, cancellation, and status changes have coupled side effects.
- These flows affect stock, coupon `used_count`, and order status logs together.
- Use transactions for changes that touch multiple order-related tables.

### Payments

Files:

- `src/api/payment`

Current behavior:

- Create MoMo payment requests for eligible orders.
- Accept MoMo IPN callbacks.
- Accept MoMo return callbacks.

Important notes:

- Callback signature verification is part of the current logic.
- Payment success updates payment records and may update the order payment status.
- Do not change MoMo callback handling without reviewing signature generation and callback parsing together.

### Admin user operations

Files:

- `src/api/admin/user`

Current behavior:

- Admin can list users, inspect details, and toggle account active state.

## Integration Notes

### PostgreSQL and Prisma

- `src/utils/prisma.ts` creates the Prisma client using `PrismaPg` and `pg.Pool`.
- Database URL comes from `DATABASE_URL`.
- Schema changes belong in `prisma/schema.prisma` with corresponding migrations.

### Redis

- `src/utils/redis.ts` creates a Redis client from `REDIS_URL`.
- Redis is connected at server startup in `src/server.ts`.
- Current auth refresh-token state is not backed by Redis.

### Cloudinary

- Config lives in `src/utils/cloudinary.ts`.
- Uploads are buffer-based and happen through Cloudinary, not local disk storage.

### Email

- Resend integration lives in `src/utils/email.ts`.
- Verification and password-reset flows depend on `BASE_URL`, `PORT`, `FRONTEND_URL`, and optionally `MOBILE_APP_URL`.

### Google OAuth

- Google login uses `GOOGLE_CLIENT_ID`.
- Token verification is handled server-side in `auth.service.ts`.

### MoMo

- Payment config is read from env vars in `payment.service.ts`.
- Keep the callback signature contract intact when touching payment flow.

## High-Risk Change Checklist

### If you add or change an endpoint

- Update the route file.
- Update or add controller logic.
- Update or add service logic.
- Update the Swagger block in the route file.
- Preserve existing auth and admin guard behavior.
- Match the current response envelope style.

### If you change Prisma schema

- Update `prisma/schema.prisma`.
- Add or update the migration.
- Make sure the generated client story still matches the committed `src/generated/prisma` runtime dependency.
- Review any impacted enum imports from both `@prisma/client` and the generated client.

### If you change image handling

- Trace where the DB stores `public_id`.
- Trace where responses convert `public_id` into URL form.
- Preserve cleanup behavior for replaced images.

### If you change order or payment logic

- Review stock updates.
- Review coupon `used_count`.
- Review payment record creation and updates.
- Review order status logs.
- Use transactions where the current logic already treats these changes as one unit of work.

## Known Gaps And Gotchas

- `src/middleware/error.middleware.ts` exists but is empty.
- There is no working automated test script in `package.json`.
- `prisma.config.ts` references `prisma/seed.ts`, but that file is missing.
- Tooling commands are defined in repo metadata, but local execution still depends on a working Node/npm environment.
- Swagger summaries sometimes describe behavior at a higher level than the exact implementation. Check the service layer before changing business rules.

## Default Expectation

When changing this codebase, prefer small, architecture-consistent edits that follow the existing module boundaries and conventions instead of introducing a new pattern for one feature.
