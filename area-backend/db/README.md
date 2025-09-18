# AREA Database

## Initialization

1. Create the database (ex : `createdb areadb`)
2. Apply the schema :
   ```sh
   ./init.sh
   ```
3. (Optional) Seed with test data :
   ```sh
   psql -U $DB_USER -d $DB_NAME -f seed.sql
   ```

## Full Reset

```sh
./reset.sh
```

## Configuration

Copy `config.example.json` and adapt it to your environment.

## Migrations

Place your migration scripts in`db/migrations/`.

## Fixtures / Tests

Use `db/fixtures/` for test datasets.

## Logs and event_logs

The `event_logs` table tracks all important actions (triggers, errors, etc):
- `event_type` : type of event (e.g., action_triggered, reaction_executed, error)
- `metadata` : additional details (JSON)
