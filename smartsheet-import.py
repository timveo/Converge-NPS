#!/usr/bin/env python3
"""
Smartsheet Import Script for Converge-NPS
This script clears mock data and imports real data from Smartsheet
"""

import requests
import json
import sys
import time
from typing import Optional

# Configuration
API_BASE = "http://localhost:3000/api/v1"
ADMIN_EMAIL = "admin@converge-nps.com"
ADMIN_PASSWORD = "Admin123!"

class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def print_header(msg: str):
    print(f"\n{Colors.HEADER}{Colors.BOLD}{'='*60}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{msg:^60}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{'='*60}{Colors.ENDC}\n")

def print_success(msg: str):
    print(f"{Colors.OKGREEN}✓ {msg}{Colors.ENDC}")

def print_error(msg: str):
    print(f"{Colors.FAIL}✗ {msg}{Colors.ENDC}")

def print_info(msg: str):
    print(f"{Colors.OKCYAN}ℹ {msg}{Colors.ENDC}")

def print_warning(msg: str):
    print(f"{Colors.WARNING}⚠ {msg}{Colors.ENDC}")

def get_admin_token() -> Optional[str]:
    """Login as admin and get JWT token"""
    print_info(f"Logging in as {ADMIN_EMAIL}...")

    try:
        response = requests.post(
            f"{API_BASE}/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            headers={"Content-Type": "application/json"}
        )

        if response.status_code == 200:
            data = response.json()
            # Check both response formats
            token = data.get("accessToken") or data.get("data", {}).get("accessToken")
            if token:
                print_success("Successfully authenticated")
                return token
            else:
                print_error("No access token in response")
                print_error(f"Response: {json.dumps(data, indent=2)}")
                return None
        else:
            print_error(f"Login failed: {response.status_code}")
            print_error(f"Response: {response.text}")
            return None
    except Exception as e:
        print_error(f"Login error: {str(e)}")
        return None

def import_data(token: str, data_type: str) -> bool:
    """Import data from Smartsheet"""
    print_info(f"Importing {data_type}...")

    try:
        response = requests.post(
            f"{API_BASE}/admin/smartsheet/import/{data_type}",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            }
        )

        if response.status_code == 200:
            data = response.json()
            result = data.get("data", {})

            imported = result.get("imported", 0)
            updated = result.get("updated", 0)
            failed = result.get("failed", 0)
            errors = result.get("errors", [])

            print_success(f"Imported {imported} new {data_type}")
            if updated > 0:
                print_info(f"Updated {updated} existing {data_type}")
            if failed > 0:
                print_warning(f"Failed to import {failed} {data_type}")
                for error in errors[:5]:  # Show first 5 errors
                    row = error.get("row", "?")
                    message = error.get("message", "Unknown error")
                    print_warning(f"  Row {row}: {message}")

            return failed == 0
        else:
            print_error(f"Import failed: {response.status_code}")
            print_error(f"Response: {response.text}")
            return False

    except Exception as e:
        print_error(f"Import error: {str(e)}")
        return False

def import_all(token: str) -> bool:
    """Import all data from Smartsheet at once"""
    print_info("Importing all data from Smartsheet...")

    try:
        response = requests.post(
            f"{API_BASE}/admin/smartsheet/import/all",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            }
        )

        if response.status_code == 200:
            data = response.json()
            print_success("Successfully imported all data")
            print_info(json.dumps(data.get("data", {}), indent=2))
            return True
        else:
            print_error(f"Import failed: {response.status_code}")
            print_error(f"Response: {response.text}")
            return False

    except Exception as e:
        print_error(f"Import error: {str(e)}")
        return False

def main():
    print_header("Converge-NPS Smartsheet Import")

    # Step 1: Get admin token
    print_header("Step 1: Authentication")
    token = get_admin_token()

    if not token:
        print_error("Failed to authenticate. Please check:")
        print_info("1. Backend server is running (npm run dev)")
        print_info("2. Admin user exists in database")
        print_info("3. Password is correct")
        sys.exit(1)

    # Step 2: Import data
    print_header("Step 2: Import Data from Smartsheet")

    print("\nChoose import method:")
    print("1. Import all data at once (recommended)")
    print("2. Import data type by type")

    choice = input("\nEnter choice (1 or 2): ").strip()

    if choice == "1":
        success = import_all(token)
        if success:
            print_header("Import Complete!")
            print_success("All data has been imported from Smartsheet")
        else:
            print_error("Import failed. Please check the error messages above.")
            sys.exit(1)
    elif choice == "2":
        data_types = ["attendees", "sessions", "projects", "partners"]
        # Note: opportunities is skipped as we don't have that sheet

        all_success = True
        for data_type in data_types:
            success = import_data(token, data_type)
            if not success:
                all_success = False
            time.sleep(1)  # Small delay between imports

        if all_success:
            print_header("Import Complete!")
            print_success("All data has been imported from Smartsheet")
        else:
            print_warning("Import completed with some errors. Check messages above.")
    else:
        print_error("Invalid choice")
        sys.exit(1)

    print("\n" + "="*60)
    print_success("You can now access the application with real data!")
    print_info("Frontend: http://localhost:5173")
    print_info("Backend: http://localhost:3000")
    print("="*60 + "\n")

if __name__ == "__main__":
    main()
