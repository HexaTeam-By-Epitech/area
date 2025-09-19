# AREA Database

## Initialization

### 1. Configure your `.env`

Before any initialization, create a `.env` file at the project root (if it doesn’t exist):

```env
DB_USER=area_user
DB_NAME=areadb
DB_PASSWORD=
```

- If `DB_PASSWORD` is empty, it will be **randomly generated** by `init.sh`.
- The generated password will be automatically written to `.env`.

### 2. Run the initialization script

This script creates the PostgreSQL user, database, applies the schema, and configures access:

```sh
./init.sh
```

The script performs the following:

- Checks if the PostgreSQL user (`area_user`) exists; creates it if not.
- Checks if the database (`areadb`) exists; creates it if not.
- Automatically applies `schema.sql`.
- Updates `.env` with a secure random password if `DB_PASSWORD` is empty.
- Adds the following line to `pg_hba.conf` if missing:

  ```
  local   all   area_user   md5
  ```

- **Sudo privileges are required** to modify `pg_hba.conf`.

### 3. (Optional) Apply test seed data

```sh
psql -U $DB_USER -d $DB_NAME -f seed.sql
```

> Use the password stored in `.env` if prompted.

---

## Full Reset

Completely delete the PostgreSQL user and database:

```sh
./reset.sh
```

> This script uses `sudo -u postgres dropdb` and `dropuser`.

---

## Configuration

Copy the example configuration and adapt it to your environment:

```sh
cp config.example.json config.json
```

---

## Manual database access

To manually connect to the database:

```sh
psql -U area_user -d areadb -W
```

- The password is defined in `.env`.
- Make sure `pg_hba.conf` contains a line like:

  ```
  local   all   area_user   md5
  ```

---

## Migrations

Store all PostgreSQL migration scripts in:

```
db/migrations/
```

---

## Fixtures / Tests

Test datasets should be placed in:

```
db/fixtures/
```

---

## Logs / Audit: `event_logs`

The `event_logs` table records all major events related to `areas`, `actions`, or errors.

Key fields:

- `event_type`: type of event (e.g., `action_triggered`, `reaction_executed`, `error`)
- `description`: summary of the event
- `metadata`: additional info (JSON format)
- `created_at`: timestamp

---

## Notes

- Do not manually change the password in `.env` without updating the PostgreSQL user accordingly.
- If the password is lost or invalid, delete the user and re-run `init.sh` to regenerate a valid `.env` and credentials.
