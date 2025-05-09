#!/bin/bash

DB_PATH="$DB_FILE_DIR/$DB_FILE_NAME"

if [ -f "$DB_PATH" ]; then
    echo "Database $DB_PATH already exists."
    pnpm run generate && pnpm run migrate || {
        echo "Error: Failed to migrate database changes."
        exit 1
    }
    echo "Database $DB_PATH is migrated."
    exit 0
else
    echo "Initializing database $DB_PATH..."
    pnpm run generate && pnpm run migrate || {
        echo "Error: Failed to prepare database."
        exit 1
    }
    echo "Database $DB_PATH is initialized."
    exit 0
fi
