#!/bin/bash
# Database backup script for Converge-NPS
# Exports PostgreSQL database to file and optionally uploads to S3

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

print_info() {
    echo -e "${NC}→ $1${NC}"
}

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    print_error "DATABASE_URL environment variable is not set"
    exit 1
fi

# Generate backup filename with timestamp
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="${BACKUP_DIR:-./backups}"
BACKUP_FILE="${BACKUP_DIR}/converge_backup_${BACKUP_DATE}.sql"
COMPRESSED_FILE="${BACKUP_FILE}.gz"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

print_info "Starting database backup..."
print_info "Backup file: $BACKUP_FILE"

# Run pg_dump
print_info "Exporting database..."
if pg_dump "$DATABASE_URL" > "$BACKUP_FILE"; then
    print_success "Database exported to $BACKUP_FILE"
else
    print_error "Database export failed"
    exit 1
fi

# Compress backup
print_info "Compressing backup..."
if gzip "$BACKUP_FILE"; then
    print_success "Backup compressed: $COMPRESSED_FILE"
else
    print_error "Compression failed"
    exit 1
fi

# Get file size
BACKUP_SIZE=$(du -h "$COMPRESSED_FILE" | cut -f1)
print_success "Backup size: $BACKUP_SIZE"

# Upload to S3 if AWS credentials are configured
if [ -n "$AWS_ACCESS_KEY_ID" ] && [ -n "$AWS_SECRET_ACCESS_KEY" ] && [ -n "$S3_BUCKET" ]; then
    print_info "Uploading backup to S3..."
    S3_PATH="s3://${S3_BUCKET}/backups/$(basename "$COMPRESSED_FILE")"

    if aws s3 cp "$COMPRESSED_FILE" "$S3_PATH"; then
        print_success "Backup uploaded to $S3_PATH"
    else
        print_error "S3 upload failed"
    fi
else
    print_info "S3 upload skipped (AWS credentials not configured)"
fi

# Clean up old backups (keep last 7 days)
print_info "Cleaning up old backups..."
find "$BACKUP_DIR" -name "converge_backup_*.sql.gz" -mtime +7 -delete
print_success "Old backups cleaned up (kept last 7 days)"

print_success "Backup completed successfully!"
print_info "Backup location: $COMPRESSED_FILE"
