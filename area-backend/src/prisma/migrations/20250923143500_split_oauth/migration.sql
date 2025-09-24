-- Split OAuth into auth_identities (login) and linked_accounts (external links)
-- 1) Create new tables
CREATE TABLE IF NOT EXISTS "public"."auth_identities" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "provider_id" INTEGER NOT NULL,
    "provider_user_id" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255),
    "name" VARCHAR(255),
    "avatar_url" VARCHAR(1024),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "auth_identities_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "auth_identities_provider_id_provider_user_id_key"
  ON "public"."auth_identities" ("provider_id", "provider_user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "auth_identities_user_id_provider_id_key"
  ON "public"."auth_identities" ("user_id", "provider_id");

ALTER TABLE "public"."auth_identities"
  ADD CONSTRAINT "auth_identities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "public"."auth_identities"
  ADD CONSTRAINT "auth_identities_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."oauth_providers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

CREATE TABLE IF NOT EXISTS "public"."linked_accounts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "provider_id" INTEGER NOT NULL,
    "provider_user_id" VARCHAR(255) NOT NULL,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "access_token_expires_at" TIMESTAMP(6),
    "scopes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT FALSE,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(6),
    CONSTRAINT "linked_accounts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "linked_accounts_provider_id_provider_user_id_key"
  ON "public"."linked_accounts" ("provider_id", "provider_user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "linked_accounts_user_id_provider_id_key"
  ON "public"."linked_accounts" ("user_id", "provider_id");

ALTER TABLE "public"."linked_accounts"
  ADD CONSTRAINT "linked_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "public"."linked_accounts"
  ADD CONSTRAINT "linked_accounts_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."oauth_providers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- 2) Migrate existing data from user_oauth_accounts to linked_accounts (best-effort)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_oauth_accounts'
  ) THEN
    INSERT INTO "public"."linked_accounts" (id, user_id, provider_id, provider_user_id, access_token, refresh_token, is_active, created_at, updated_at)
    SELECT id, user_id, provider_id, provider_user_id, access_token, refresh_token, is_active, created_at, updated_at
    FROM "public"."user_oauth_accounts"
    ON CONFLICT (provider_id, provider_user_id) DO NOTHING;
  END IF;
END $$;

-- 3) (Optional) Drop old table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_oauth_accounts'
  ) THEN
    DROP TABLE "public"."user_oauth_accounts";
  END IF;
END $$;
