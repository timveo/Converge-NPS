#!/bin/bash
# Database restore script for Converge-NPS
# Restores PostgreSQL database from backup file

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${NC}→ $1${NC}"
}

# Check if backup file is provided
if [ -z "$1" ]; then
    print_error "Usage: $0 <backup-file.sql.gz>"
    print_info "Example: $0 ./backups/converge_backup_20251202_120000.sql.gz"
    exit 1
fi

BACKUP_FILE="$1"

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    print_error "Backup file not found: $BACKUP_FILE"
    exit 1
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    print_error "DATABASE_URL environment variable is not set"
    exit 1
fi

print_warning "⚠️  WARNING: This will OVERWRITE the current database!"
print_info "Database: ${DATABASE_URL%%@*}@***"
print_info "Backup file: $BACKUP_FILE"
echo ""
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    print_info "Restore cancelled"
    exit 0
fi

print_info "Starting database restore..."

# Decompress backup if gzipped
if [[ "$BACKUP_FILE" == *.gz ]]; then
    print_info "Decompressing backup..."
    TEMP_FILE=$(mktemp)
    if gunzip -c "$BACKUP_FILE" > "$TEMP_FILE"; then
        print_success "Backup decompressed"
    else
        print_error "Decompression failed"
        rm -f "$TEMP_FILE"
        exit 1
    fi
else
    TEMP_FILE="$BACKUP_FILE"
fi

# Drop existing database (use with caution!)
print_warning "Dropping existing database..."
# Note: This may fail if there are active connections

# Restore from backup
print_info "Restoring database from backup..."
if psql "$DATABASE_URL" < "$TEMP_FILE"; then
    print_success "Database restored successfully"
else
    print_error "Database restore failed"
    [ "$TEMP_FILE" != "$BACKUP_FILE" ] && rm -f "$TEMP_FILE"
    exit 1
fi

# Clean up temp file
[ "$TEMP_FILE" != "$BACKUP_FILE" ] && rm -f "$TEMP_FILE"

# Run migrations to ensure schema is up-to-date
print_info "Running migrations to ensure schema is current..."
if npx prisma migrate deploy; then
    print_success "Migrations applied"
else
    print_warning "Migration failed - manual intervention may be required"
fi

print_success "Database restore completed successfully!"
print_warning "Remember to verify data integrity and restart application services"
