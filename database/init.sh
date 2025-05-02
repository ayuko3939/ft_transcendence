#!/bin/bash

DB_PATH="$DB_FILE_DIR/$DB_FILE_NAME"

if [ -f "$DB_PATH" ]; then
    echo "Database $DB_PATH already exists."
    exit 0
else
    echo "Initializing database $DB_PATH..."
    pnpm run push || {
        echo "Error: Failed to push database changes."
        exit 1
    }
    echo "Database $DB_PATH is already initialized."
    exit 0
fi
