#!/usr/bin/env python3
"""
Inspect Smartsheet Columns
This script fetches the column names from each Smartsheet to help debug import issues
"""

import requests
import json
import sys
from typing import Dict, List

# Configuration from .env
SMARTSHEET_API_KEY = "h6gMRTZ6pxrQEj98x28vAbT9hOBT6252sjm6b"
SMARTSHEET_BASE_URL = "https://api.smartsheet.com/2.0"

SHEET_IDS = {
    "Event Schedule (Sessions)": "3279253824032644",
    "Faculty/Student Project Intake (Projects)": "5201465615273860",
    "Industry Intake (Partners)": "6623099790249860",
    "Registration (Attendees)": "1292185526816644",
}

def fetch_sheet_columns(sheet_id: str) -> Dict:
    """Fetch sheet metadata including columns"""
    headers = {
        "Authorization": f"Bearer {SMARTSHEET_API_KEY}",
        "Content-Type": "application/json"
    }

    url = f"{SMARTSHEET_BASE_URL}/sheets/{sheet_id}"
    response = requests.get(url, headers=headers)

    if response.status_code == 200:
        return response.json()
    else:
        return {"error": response.text}

def print_sheet_info(sheet_name: str, sheet_data: Dict):
    """Print formatted sheet information"""
    print("\n" + "="*80)
    print(f"📊 {sheet_name}")
    print("="*80)

    if "error" in sheet_data:
        print(f"❌ Error fetching sheet: {sheet_data['error']}")
        return

    print(f"\nSheet Name: {sheet_data.get('name', 'Unknown')}")
    print(f"Total Rows: {sheet_data.get('totalRowCount', 0)}")
    print(f"\nColumns Found:")
    print("-" * 80)

    columns = sheet_data.get('columns', [])
    for idx, col in enumerate(columns, 1):
        col_title = col.get('title', 'Untitled')
        col_type = col.get('type', 'Unknown')
        col_id = col.get('id', 'Unknown')
        print(f"{idx:2d}. {col_title:40s} (Type: {col_type:15s} ID: {col_id})")

    # Show first row of data as sample
    rows = sheet_data.get('rows', [])
    if rows:
        print(f"\n📝 Sample Data (First Row):")
        print("-" * 80)
        first_row = rows[0]
        cells = first_row.get('cells', [])

        for idx, cell in enumerate(cells):
            if idx < len(columns):
                col_name = columns[idx].get('title', 'Unknown')
                value = cell.get('displayValue') or cell.get('value', '<empty>')
                print(f"  {col_name:40s}: {value}")

def main():
    print("\n" + "="*80)
    print("🔍 SMARTSHEET COLUMN INSPECTOR")
    print("="*80)
    print("\nFetching data from your Smartsheets...\n")

    for sheet_name, sheet_id in SHEET_IDS.items():
        print(f"Fetching {sheet_name}...")
        sheet_data = fetch_sheet_columns(sheet_id)
        print_sheet_info(sheet_name, sheet_data)

    print("\n" + "="*80)
    print("✅ Inspection Complete!")
    print("="*80)
    print("\nNext Steps:")
    print("1. Compare the column names above with the expected columns")
    print("2. Either rename columns in Smartsheet OR update import mapping")
    print("="*80 + "\n")

if __name__ == "__main__":
    main()
