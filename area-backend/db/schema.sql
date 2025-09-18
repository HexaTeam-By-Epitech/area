Table users {
  id uuid [pk]
  email varchar(255) [unique, not null]
  password_hash varchar(255)
  is_verified boolean [default: false, not null]
  is_active boolean [default: false, not null]
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
  deleted_at timestamp [default: null]
}

Table oauth_providers {
  id int [pk, increment]
  name varchar(50) [not null]
  is_active boolean [default: false, not null]
}

Table user_oauth_accounts {
  id uuid [pk]
  user_id uuid [ref: > users.id, not null]
  provider_id int [ref: > oauth_providers.id, not null]
  provider_user_id varchar(255) [not null]
  access_token text
  refresh_token text
  is_active boolean [default: false, not null]
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
  deleted_at timestamp [default: null]

  indexes {
    (provider_id, provider_user_id) [unique]
    (user_id, provider_id) [unique]
  }
}

Table services {
  id uuid [pk]
  name varchar(100) [not null]
  description text
  is_active boolean [default: false, not null]
}

Table actions {
  id uuid [pk]
  service_id uuid [ref: > services.id, not null]
  name varchar(100) [not null]
  description text
  config_schema jsonb
  is_active boolean [default: false, not null]
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
  deleted_at timestamp [default: null]
}

Table reactions {
  id uuid [pk]
  service_id uuid [ref: > services.id, not null]
  name varchar(100) [not null]
  description text
  config_schema jsonb
  is_active boolean [default: false, not null]
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
  deleted_at timestamp [default: null]
}

Table areas {
  id uuid [pk]
  user_id uuid [ref: > users.id, not null]
  action_id uuid [ref: > actions.id, not null]
  reaction_id uuid [ref: > reactions.id, not null]
  config jsonb
  is_active boolean [default: false, not null]
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
  deleted_at timestamp [default: null]
}

Table event_logs {
  id uuid [pk]
  user_id uuid [ref: > users.id]
  area_id uuid [ref: > areas.id]
  event_type varchar(100) [not null]
  description text
  metadata jsonb
  created_at timestamp [default: `now()`]

  indexes {
    (user_id)
    (area_id)
    (event_type)
    (created_at)
  }
}
