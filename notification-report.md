# Notification Feature Readiness Report

## Scope

Reviewed files:

- `src/api/notification/notification.controller.ts`
- `src/api/notification/notification.route.ts`
- `src/api/notification/notification.service.ts`
- `src/utils/notification.ts`
- `src/utils/firebase.ts`
- `src/api/auth/auth.controller.ts`
- `src/api/auth/auth.route.ts`
- `src/api/auth/auth.validation.ts`
- `prisma/schema.prisma`

## Overall verdict

The notification feature is **closer to mobile-app readiness**, but it is still **not production-ready** because `GET /notifications/stream` still sends dummy test notifications every 2 seconds.

Good progress has been made since the earlier report:

- Notification list response now uses a `pagination` object.
- `NotificationType` imports in the notification controller and service are now consistent through `@prisma/client`.
- Offline FCM sends are batched.
- Empty FCM token lists are skipped.
- Invalid/unregistered FCM tokens are deleted after Firebase send failures.
- Logout accepts optional `fcm_token` and deletes that token for the authenticated user.
- Online status now uses a short 60-second TTL.
- SSE now refreshes online status every minute.
- Firebase connection checking now uses Firebase Messaging dry-run send instead of Firestore.

The largest remaining blocker is the active dummy interval in `streamNotifications()`.

## Current API surface

Notification routes:

- `POST /notifications/token-registration`
- `GET /notifications/`
- `GET /notifications/unread-count`
- `GET /notifications/stream`
- `POST /notifications/mark-as-read`
- `POST /notifications/mark-all-as-read`

Auth logout also supports FCM cleanup:

- `POST /auth/logout`
  - required body field: `refresh_token`
  - optional body field: `fcm_token`

## What is working well

### Database model is suitable as a base

`prisma/schema.prisma` defines:

- `Notifications`
- `UserNotifications`
- `UserFcmTokens`
- `NotificationType`
- `DevicePlatform`

This supports notification records, per-user read state, multiple device tokens per user, unique token storage, and platform tracking.

### Notification routes are protected

All notification endpoints use `Authenticate`, which is correct because notification data and device tokens are user-specific.

### FCM token registration exists

`registerToken()` validates `device_type` against `DevicePlatform` and upserts by token.

This is appropriate for mobile clients because Firebase tokens can be refreshed and re-registered.

### Logout FCM cleanup is implemented

`auth.controller.ts` reads optional `fcm_token` from the logout body and passes it to `auth.service.ts`.

`auth.service.ts` calls `deleteFcmToken(userId, fcmToken)` when the token is present.

`auth.route.ts` validates the logout payload with `logoutSchema` and documents the optional `fcm_token` in Swagger.

This is ready for the normal mobile logout cleanup flow.

### Offline push delivery is improved

`sendNotification()` now:

1. checks each target user's online status,
2. sends Redis/SSE notifications to online users,
3. batches offline user IDs,
4. fetches all offline FCM tokens in one query,
5. skips Firebase send if there are no tokens,
6. sends one multicast message,
7. deletes invalid or unregistered tokens.

This is a good implementation direction.

### Invalid FCM token cleanup is present

The service deletes failed tokens for these permanent Firebase errors:

- `messaging/invalid-registration-token`
- `messaging/registration-token-not-registered`

This helps keep the `UserFcmTokens` table clean over time.

### Online status TTL is improved

`markUserAsOnline()` now stores the online marker with a 60-second TTL:

```ts
await client.set(`markAsOnline:${user_id}`, 1, { EX: 60 });
```

`streamNotifications()` also refreshes the TTL every minute with `refreshUserOnlineStatus()`.

This is much safer than the previous 24-hour TTL.

### Firebase connection check now matches Messaging better

`checkFirebaseConnect()` no longer uses Firestore. It now calls `firebaseMessaging.send(..., true)` as a dry-run style check.

That is better aligned with the actual notification feature, which uses Firebase Cloud Messaging.

## Remaining blocking issues

### 1. SSE endpoint still sends fake notifications every 2 seconds

`notification.controller.ts` still contains this active test interval inside `streamNotifications()`:

```ts
let cnt = 1;
const intervalId = setInterval(() => {
  notificationService.sendNotification([userId], {
    id: cnt,
    title: `Notification ${cnt}`,
    body: `This is notification number ${cnt}`,
    type: "order",
    metadata: {
      orderId: 123,
      status: "shipped"
    },
    created_at: new Date().toISOString(),
  });
  cnt++;
}, 2000);
```

This is a production blocker.

Every client that opens the SSE stream will receive fake order notifications continuously. This will confuse the mobile app, pollute the UX, and make real notification testing unreliable.

Required fix:

- Remove the dummy `setInterval()` block.
- Remove `intervalId` cleanup after the dummy interval is removed.
- Keep only the online marker, Redis subscription, TTL refresh interval, and request-close cleanup.

### 2. Online TTL refresh interval equals the TTL

The online TTL is 60 seconds and the refresh interval is also 60 seconds:

```ts
setInterval(async () => {
  await refreshUserOnlineStatus(userId);
}, 1000 * 60);
```

This can race with Redis expiration. If the refresh runs late because of event loop delay or scheduling jitter, the key may expire before it is refreshed.

Recommended fix:

- keep TTL at 60 seconds,
- refresh every 20-30 seconds,
- or increase TTL to 90-120 seconds while refreshing every 30 seconds.

### 3. Redis online counter can still drift

The current online-state model uses one Redis counter per user:

```text
markAsOnline:{userId} = count
```

This is better than a boolean, but it can still become inaccurate if a process crashes or cleanup fails. The TTL limits the damage, but a per-connection-key model would be safer.

Recommended future improvement:

```text
notification:online:{userId}:{connectionId} = 1 EX 60
```

Then the server can treat a user as online if any active connection key exists.

### 4. Firebase environment variables are still not explicitly validated

`firebase.ts` still initializes Firebase with empty-string fallbacks:

```ts
projectId: process.env.FIREBASE_PROJECT_ID || ''
clientEmail: process.env.FIREBASE_CLIENT_EMAIL || ''
privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n") || ''
```

This can produce unclear startup or runtime errors when env vars are missing.

Recommended fix:

- Check `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY` before `admin.initializeApp()`.
- Throw a clear error if any required value is missing.
- Avoid passing empty strings as credentials.

### 5. Notification routes still have no Swagger documentation

`notification.route.ts` still only defines route handlers. There are no Swagger annotations for the notification endpoints.

This project keeps Swagger docs in route files, so the mobile notification endpoints should document:

- auth requirement,
- request bodies,
- query parameters,
- response shapes,
- `NotificationType` enum values,
- `DevicePlatform` enum values.

### 6. Notification request validation is still incomplete

Current notification controllers still validate manually and lightly.

Remaining gaps:

- `registerToken()` checks truthiness but not string type or trimmed non-empty token.
- `getNotifications()` parses `page` and `limit` with `parseInt()` but does not reject invalid, negative, zero, or too-large values.
- `markAsRead()` checks that `notificationIds` is an array but does not verify all values are positive integers.
- There is no maximum `limit` to prevent large notification queries.

Recommended fix:

Add `notification.validation.ts` with Zod schemas and use the existing `validate` middleware.

### 7. Notification list response is improved but still nested

The response is now better than before:

```json
{
  "success": true,
  "data": {
    "notifications": []
  },
  "pagination": {
    "total": 0,
    "page": 1,
    "limit": 10,
    "hasMore": false
  }
}
```

This is acceptable, but mobile clients may prefer `data` to be the notification array directly:

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "total": 0,
    "page": 1,
    "limit": 10,
    "hasMore": false
  }
}
```

Also, each notification still includes `user_notifications` as a nested array instead of flat `is_read` and `read_at` fields.

This is not a blocker, but flattening would make the mobile app simpler.

### 8. FCM payload contract still needs mobile confirmation

FCM sends a data-only payload:

```ts
data: {
  notification: stringData
}
```

This is valid if the mobile app explicitly parses `message.data.notification`.

Before release, confirm whether the mobile app needs:

- data-only messages,
- notification messages displayed by the OS,
- or combined notification + data payloads.

This is especially important for iOS background/terminated behavior.

### 9. `clear` import in notification controller is unused

`notification.controller.ts` imports:

```ts
import { clear } from 'node:console';
```

This does not appear to be used and should be removed.

This is not a functional blocker, but it is cleanup that should happen before release.

## Endpoint-by-endpoint readiness

### `POST /notifications/token-registration`

Status: **mostly ready**.

Good:

- authenticated,
- stores token for the user,
- validates platform enum,
- uses token upsert.

Needs:

- Zod validation,
- Swagger docs,
- stricter token string validation.

### `GET /notifications/`

Status: **partially ready**.

Good:

- authenticated,
- supports pagination,
- supports type filtering,
- now returns `pagination` separately.

Needs:

- validate page/limit/type,
- add max limit,
- optionally flatten mobile response fields.

### `GET /notifications/unread-count`

Status: **ready**.

This endpoint is simple and appropriate for mobile badge counts.

### `GET /notifications/stream`

Status: **not production-ready**.

Good:

- uses SSE,
- marks user online,
- subscribes to Redis,
- refreshes online TTL,
- cleans up on close.

Blocking issue:

- still sends dummy test notifications every 2 seconds.

Recommended fixes:

- remove dummy interval,
- refresh online TTL before it expires,
- consider SSE heartbeat comments such as `: ping\n\n` to keep proxies from closing idle connections.

### `POST /notifications/mark-as-read`

Status: **partially ready**.

Good:

- updates only notification rows belonging to the authenticated user.

Needs:

- validate non-empty array of positive integer IDs,
- Swagger docs.

### `POST /notifications/mark-all-as-read`

Status: **ready**.

This endpoint is simple and appropriate.

### `POST /auth/logout`

Status: **ready for FCM token cleanup**.

Good:

- requires auth,
- validates body with `logoutSchema`,
- invalidates refresh token,
- deletes optional `fcm_token` for the authenticated user only,
- Swagger documents the optional field.

## Updated fix status

| Issue | Current status |
| --- | --- |
| Notification routes mounted | Fixed |
| Logout FCM token cleanup | Fixed |
| Empty FCM token send | Fixed |
| Invalid FCM token cleanup | Fixed |
| Offline FCM batching | Fixed |
| Prisma notification enum imports inconsistent | Fixed in notification controller/service |
| Notification list pagination shape | Improved |
| Firestore-based Firebase check | Fixed; now uses Messaging dry-run |
| Online state had no/long TTL | Improved with 60s TTL |
| Online TTL refresh | Improved, but interval should be shorter than TTL |
| Dummy SSE test notifications | Still open; production blocker |
| Firebase env validation | Still open |
| Notification route Swagger docs | Still open |
| Notification request validation | Still open |
| Mobile FCM payload contract | Still needs confirmation |
| Nested notification read-state response | Still could be improved |

## Recommended next steps before mobile release

Minimum required:

1. Remove the dummy `setInterval()` notification sender from `streamNotifications()`.
2. Change the online TTL refresh interval to run before the TTL expires, for example every 30 seconds.
3. Add explicit Firebase env var validation before `admin.initializeApp()`.
4. Add Zod validation schemas for notification endpoints.
5. Add Swagger documentation to `notification.route.ts`.
6. Confirm the mobile app's FCM payload expectations.

Recommended cleanup:

1. Remove the unused `clear` import from `notification.controller.ts`.
2. Flatten notification list items to include `is_read` and `read_at` directly.
3. Consider returning notification array directly in `data`.
4. Consider per-connection Redis keys instead of a user-level counter.

## Final assessment

The notification feature has improved and is suitable for continued mobile integration testing.

It is **not ready for production mobile release** until the dummy SSE notification interval is removed and the remaining validation, documentation, Firebase config, and payload-contract issues are handled.
