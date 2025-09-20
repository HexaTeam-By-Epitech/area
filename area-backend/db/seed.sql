-- db/seed.sql
-- Example data for each table

INSERT INTO users (id, email, password_hash, is_verified, is_active)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'alice@example.com', 'hash1', true, true),
    ('22222222-2222-2222-2222-222222222222', 'bob@example.com', 'hash2', false, false);

INSERT INTO oauth_providers (id, name, is_active)
VALUES
    (1, 'google', true),
    (2, 'github', true);

INSERT INTO user_oauth_accounts (id, user_id, provider_id, provider_user_id, access_token, refresh_token, is_active)
VALUES
    ('aaaaaaa1-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 1, 'google-alice', 'token1', 'refresh1', true),
    ('aaaaaaa2-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 2, 'github-bob', 'token2', 'refresh2', false);

INSERT INTO services (id, name, description, is_active)
VALUES
    ('33333333-3333-3333-3333-333333333333', 'Gmail', 'Google email service', true),
    ('44444444-4444-4444-4444-444444444444', 'Slack', 'Messaging service', true);

INSERT INTO actions (id, service_id, name, description, config_schema, is_active)
VALUES
    ('55555555-5555-5555-5555-555555555555', '33333333-3333-3333-3333-333333333333', 'New Email', 'Detects a new email', '{}', true);

INSERT INTO reactions (id, service_id, name, description, config_schema, is_active)
VALUES
    ('66666666-6666-6666-6666-666666666666', '44444444-4444-4444-4444-444444444444', 'Send Message', 'Sends a Slack message', '{}', true);

INSERT INTO areas (id, user_id, action_id, reaction_id, config, is_active)
VALUES
    ('77777777-7777-7777-7777-777777777777', '11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', '66666666-6666-6666-6666-666666666666', '{}', true);

INSERT INTO event_logs (id, user_id, area_id, event_type, description, metadata)
VALUES
    ('88888888-8888-8888-8888-888888888888', '11111111-1111-1111-1111-111111111111', '77777777-7777-7777-7777-777777777777', 'action_triggered', 'New email detected', '{}');
