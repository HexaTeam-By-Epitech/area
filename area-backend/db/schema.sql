-- Users table
CREATE TABLE IF NOT EXISTS users (
                                     id UUID PRIMARY KEY,
                                     email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),
    deleted_at TIMESTAMP DEFAULT NULL
    );

-- OAuth providers
CREATE TABLE IF NOT EXISTS oauth_providers (
                                               id SERIAL PRIMARY KEY,
                                               name VARCHAR(50) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT FALSE
    );

-- User OAuth accounts
CREATE TABLE IF NOT EXISTS user_oauth_accounts (
                                                   id UUID PRIMARY KEY,
                                                   user_id UUID NOT NULL REFERENCES users(id),
    provider_id INT NOT NULL REFERENCES oauth_providers(id),
    provider_user_id VARCHAR(255) NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),
    deleted_at TIMESTAMP DEFAULT NULL,
    UNIQUE(provider_id, provider_user_id),
    UNIQUE(user_id, provider_id)
    );

-- Services table
CREATE TABLE IF NOT EXISTS services (
                                        id UUID PRIMARY KEY,
                                        name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT FALSE
    );

-- Actions table
CREATE TABLE IF NOT EXISTS actions (
                                       id UUID PRIMARY KEY,
                                       service_id UUID NOT NULL REFERENCES services(id),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    config_schema JSONB,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),
    deleted_at TIMESTAMP DEFAULT NULL
    );

-- Reactions table
CREATE TABLE IF NOT EXISTS reactions (
                                         id UUID PRIMARY KEY,
                                         service_id UUID NOT NULL REFERENCES services(id),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    config_schema JSONB,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),
    deleted_at TIMESTAMP DEFAULT NULL
    );

-- Areas table
CREATE TABLE IF NOT EXISTS areas (
                                     id UUID PRIMARY KEY,
                                     user_id UUID NOT NULL REFERENCES users(id),
    action_id UUID NOT NULL REFERENCES actions(id),
    reaction_id UUID NOT NULL REFERENCES reactions(id),
    config JSONB,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),
    deleted_at TIMESTAMP DEFAULT NULL
    );

-- Event logs table
CREATE TABLE IF NOT EXISTS event_logs (
                                          id UUID PRIMARY KEY,
                                          user_id UUID REFERENCES users(id),
    area_id UUID REFERENCES areas(id),
    event_type VARCHAR(100) NOT NULL,
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT now()
    );

-- Indexes for event_logs
CREATE INDEX IF NOT EXISTS idx_event_logs_user_id ON event_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_event_logs_area_id ON event_logs(area_id);
CREATE INDEX IF NOT EXISTS idx_event_logs_event_type ON event_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_event_logs_created_at ON event_logs(created_at);
