-- Persiste a role na sessao para que a rotacao de refresh token
-- nao degrade tokens operator/admin para anonymous_device.
ALTER TABLE "device_sessions" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'anonymous_device';
