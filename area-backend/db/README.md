# AREA Database

## Initialization

### 1. Configure your `.env`

Before initializing the database, create a `.env` file at area-backend folder (if it doesn't exist):

```env
DB_USER=area_user
DB_NAME=areadb
PGHOST=localhost
PGPORT=5432
DB_PASSWORD=
```

* If `DB_PASSWORD` is empty, `init.sh` will **generate a random secure password** for `$DB_USER`.
* The generated password will automatically be updated in the `.env` file.

### 2. Run the initialization script

```sh
./init.sh
```

This script performs the following:

* Creates the PostgreSQL user `$DB_USER` if it does not exist.
* Updates the password of the user with the value in `.env` (or the generated password).
* Creates the database `$DB_NAME` if it does not exist, owned by `$DB_USER`.
* Applies `schema.sql`.
* Applies `seed.sql` if present.

> **Note:** The script no longer modifies `pg_hba.conf` automatically. You must ensure that the following line exists for proper password authentication (
for more details see the section "Use a clean configuration"):

```
local   all   area_user   md5
```

* This line is necessary so that `psql` connects using the password (`md5`) rather than `peer`.
* If it's missing, add it manually and restart PostgreSQL:

```sh
sudo systemctl restart postgresql
```

---

### 3. Access the database

To access the database manually:

```sh
psql -U area_user -d areadb -W
```

* Enter the password stored in `.env` when prompted.
* List tables:

```sql
\dt
```

* Describe a table:

```sql
\d users
```

* Exit `psql`:

```sql
\q
```

---


## Common PostgreSQL errors and solutions

### 1. `psql: error: connection to server on socket "/var/run/postgresql/.s.PGSQL.5432" failed: No such file or directory`

This means PostgreSQL is **not running** or the socket cannot be found.

**Check cluster status:**

```sh
pg_lsclusters
```

* `Status` should be `online`. If it's `down`, start it:

```sh
sudo pg_ctlcluster 16 main start
```

* If that fails, inspect the systemd service:

```sh
sudo systemctl status postgresql@16-main.service
journalctl -xeu postgresql@16-main.service
```

**Most common cause:** `pg_hba.conf` is corrupted or contains invalid lines.

---

### 2. Fix `pg_hba.conf` issues

1. Backup current file:

```sh
sudo cp /etc/postgresql/16/main/pg_hba.conf /etc/postgresql/16/main/pg_hba.conf.bak
```

2. Use a clean configuration (the ligne about area_user need to be in the exact same order):

```conf
# Database administrative login by Unix domain socket
local   all             postgres                                peer

# TYPE  DATABASE        USER            ADDRESS                 METHOD
local   all             area_user                               md5

# "local" is for Unix domain socket connections only
local   all             all                                     peer
# IPv4 local connections:
host    all             all             127.0.0.1/32            scram-sha-256
# IPv6 local connections:
host    all             all             ::1/128                 scram-sha-256
# Allow replication connections from localhost, by a user with the
# replication privilege.
local   replication     all                                     peer
host    replication     all             127.0.0.1/32            scram-sha-256
host    replication     all             ::1/128                 scram-sha-256
```

3. Check file permissions:

```sh
sudo chown postgres:postgres /etc/postgresql/16/main/pg_hba.conf
sudo chmod 600 /etc/postgresql/16/main/pg_hba.conf
```

4. Restart PostgreSQL:

```sh
sudo systemctl restart postgresql@16-main
```

5. Confirm cluster is online:

```sh
pg_lsclusters
```

---

### 3. Other tips

* Avoid running `init.sh` without a valid `.env` file; it may generate an empty user or fail to update passwords.
* If you lose the password for `area_user`:

```sh
sudo -u postgres psql -c "ALTER USER area_user WITH PASSWORD 'newpassword';"
```

* Ensure there are **no duplicate or malformed lines** for `area_user` in `pg_hba.conf`.
* For any connection issues, always check that the PostgreSQL cluster is running and listening on port `5432`.

---

## Fixtures / Tests

Place test datasets in:

```
db/fixtures/
```

---

## Logs / Audit: `event_logs`

The `event_logs` table tracks important events related to `areas`, `actions`, or errors.

Main columns:

* `event_type` : type of event (`action_triggered`, `reaction_executed`, `error`)
* `description` : summary of the event
* `metadata` : additional details (JSON)
* `created_at` : timestamp
