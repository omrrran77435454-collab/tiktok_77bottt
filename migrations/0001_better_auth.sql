-- =============================================================================
-- 0001 — جداول Better Auth الأساسية
--
-- هذا الملف مُولَّد من Better Auth نفسه عبر:
--     node scripts/generate-auth-migration.mjs
-- لا تعدّله يدوياً؛ إذا تغيّرت إعدادات Better Auth أعد توليده وأضف migration جديدة.
--
-- ملاحظة: أعمدة التواريخ من نوع `date` لكن SQLite/D1 يخزّنها كنص ISO-8601
-- (Better Auth يستخدم supportsDates=false مع SQLite)، لذلك المقارنة النصية صحيحة.
-- =============================================================================

CREATE TABLE "user" (
  "id" text NOT NULL PRIMARY KEY,
  "name" text NOT NULL,
  "email" text NOT NULL UNIQUE,
  "emailVerified" integer NOT NULL,
  "image" text,
  "createdAt" date NOT NULL,
  "updatedAt" date NOT NULL,
  "role" text
);

CREATE TABLE "session" (
  "id" text NOT NULL PRIMARY KEY,
  "expiresAt" date NOT NULL,
  "token" text NOT NULL UNIQUE,
  "createdAt" date NOT NULL,
  "updatedAt" date NOT NULL,
  "ipAddress" text,
  "userAgent" text,
  "userId" text NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE
);

CREATE TABLE "account" (
  "id" text NOT NULL PRIMARY KEY,
  "accountId" text NOT NULL,
  "providerId" text NOT NULL,
  "userId" text NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
  "accessToken" text,
  "refreshToken" text,
  "idToken" text,
  "accessTokenExpiresAt" date,
  "refreshTokenExpiresAt" date,
  "scope" text,
  "password" text,
  "createdAt" date NOT NULL,
  "updatedAt" date NOT NULL
);

CREATE TABLE "verification" (
  "id" text NOT NULL PRIMARY KEY,
  "identifier" text NOT NULL,
  "value" text NOT NULL,
  "expiresAt" date NOT NULL,
  "createdAt" date NOT NULL,
  "updatedAt" date NOT NULL
);

CREATE INDEX "session_userId_idx" ON "session" ("userId");
CREATE INDEX "account_userId_idx" ON "account" ("userId");
CREATE INDEX "verification_identifier_idx" ON "verification" ("identifier");

-- فهرس إضافي لإحصاءات "المستخدمون الجدد اليوم/الأسبوع/الشهر" في لوحة الإدارة.
CREATE INDEX "user_createdAt_idx" ON "user" ("createdAt");
