#!/usr/bin/env python3
"""Check for drift between SQLAlchemy models and the actual PostgreSQL schema.

Compares column names and types from information_schema.columns against
the SQLAlchemy model metadata for every table Python models reference.

Exit code 0 = no drift, 1 = drift detected.

Usage:
    DATABASE_URL=postgresql://... uv run python scripts/check_schema_drift.py
"""

import asyncio
import os
import sys

import asyncpg


# Map of modeled tables -> set of expected column names (snake_case)
def get_modeled_tables() -> dict[str, set[str]]:
    """Extract table → columns from SQLAlchemy models without importing the full app."""
    # Import models to inspect metadata
    # Trigger model registration by importing all models
    import app.db.models  # noqa: F401
    from app.db.models.base import Base

    tables: dict[str, set[str]] = {}
    for table in Base.metadata.tables.values():
        tables[table.name] = {col.name for col in table.columns}
    return tables


# PostgreSQL type normalization for comparison
PG_TYPE_MAP: dict[str, str] = {
    "character varying": "VARCHAR",
    "text": "TEXT",
    "uuid": "UUID",
    "integer": "INTEGER",
    "bigint": "BIGINT",
    "boolean": "BOOLEAN",
    "numeric": "NUMERIC",
    "real": "REAL",
    "double precision": "DOUBLE PRECISION",
    "date": "DATE",
    "time without time zone": "TIME",
    "timestamp with time zone": "TIMESTAMPTZ",
    "timestamp without time zone": "TIMESTAMP",
    "jsonb": "JSONB",
    "json": "JSON",
    "bytea": "BYTEA",
    "USER-DEFINED": "ENUM",
}


def normalize_pg_type(data_type: str) -> str:
    return PG_TYPE_MAP.get(data_type, data_type.upper())


async def main() -> int:
    database_url = os.environ.get(
        "DATABASE_URL", "postgresql://postgres:postgres@localhost:54322/postgres"
    )

    modeled = get_modeled_tables()
    if not modeled:
        print("ERROR: No SQLAlchemy models found.")
        return 1

    print(f"Checking {len(modeled)} modeled tables...")

    conn = await asyncpg.connect(database_url)
    try:
        drift_found = False

        for table_name, expected_columns in sorted(modeled.items()):
            # Query actual columns from information_schema
            rows = await conn.fetch(
                """
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = $1
                ORDER BY ordinal_position
                """,
                table_name,
            )

            if not rows:
                print(f"  MISSING TABLE: {table_name}")
                drift_found = True
                continue

            actual_columns = {row["column_name"] for row in rows}

            # Check for missing columns in DB
            missing_in_db = expected_columns - actual_columns
            if missing_in_db:
                print(f"  {table_name}: columns in model but NOT in DB: {sorted(missing_in_db)}")
                drift_found = True

            # Check for extra columns in DB (info only, not an error)
            extra_in_db = actual_columns - expected_columns
            if extra_in_db:
                print(
                    f"  {table_name}: columns in DB but NOT in model "
                    f"(ok if intentional): {sorted(extra_in_db)}"
                )

        if drift_found:
            print("\nDRIFT DETECTED — SQLAlchemy models do not match the database.")
            return 1

        print("\nNo drift detected. All models match the database.")
        return 0
    finally:
        await conn.close()


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
