#!/bin/bash
# Database migration script for Converge-NPS
# Runs Prisma migrations in specified environment

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    print_error "DATABASE_URL environment variable is not set"
    exit 1
fi

print_info "Starting database migrations..."
print_info "Database: ${DATABASE_URL%%@*}@***"

# Generate Prisma client
print_info "Generating Prisma client..."
if npx prisma generate; then
    print_success "Prisma client generated"
else
    print_error "Failed to generate Prisma client"
    exit 1
fi

# Run migrations
print_info "Running database migrations..."
if npx prisma migrate deploy; then
    print_success "Migrations completed successfully"
else
    print_error "Migration failed"
    exit 1
fi

# Verify database connection
print_info "Verifying database connection..."
if npx prisma db execute --stdin <<SQL
SELECT 1;
SQL
then
    print_success "Database connection verified"
else
    print_warning "Could not verify database connection"
fi

print_success "All migration tasks completed!"
