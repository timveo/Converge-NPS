#!/usr/bin/env python3
"""
Setup Admin User for Converge-NPS
This script directly updates the database to make a user an admin
"""

import psycopg2
import sys
from datetime import datetime

# Database connection
DB_CONFIG = {
    "host": "localhost",
    "port": 5432,
    "database": "converge_nps",
    "user": "postgres",
    "password": "postgres"
}

USER_EMAIL = "admin@converge-nps.com"

def update_user_role():
    """Update user role to admin"""
    try:
        print(f"\n🔄 Connecting to database...")
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()

        # Get user ID
        cursor.execute(
            'SELECT id, full_name, email FROM profiles WHERE email = %s',
            (USER_EMAIL,)
        )
        user = cursor.fetchone()

        if not user:
            print(f"❌ User {USER_EMAIL} not found in database")
            print(f"ℹ  Please register the user first")
            return False

        user_id, full_name, email = user
        print(f"✓ Found user: {full_name} ({email})")

        # Check if user already has admin role
        cursor.execute(
            'SELECT role FROM user_roles WHERE user_id = %s AND role = %s',
            (user_id, 'admin')
        )
        existing_admin = cursor.fetchone()

        if existing_admin:
            print(f"✓ User already has admin role")
            return True

        # Update existing role to admin
        cursor.execute(
            'UPDATE user_roles SET role = %s WHERE user_id = %s',
            ('admin', user_id)
        )

        # Also insert role history
        cursor.execute(
            '''INSERT INTO user_role_history
               (id, user_id, role, action, changed_by, changed_at, notes)
               VALUES (gen_random_uuid(), %s, %s, %s, %s, %s, %s)''',
            (user_id, 'admin', 'added', user_id, datetime.utcnow(), 'Initial admin setup')
        )

        conn.commit()
        print(f"✓ User role updated to admin")

        cursor.close()
        conn.close()

        return True

    except psycopg2.Error as e:
        print(f"❌ Database error: {e}")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def main():
    print("="*60)
    print("Converge-NPS Admin Setup")
    print("="*60)

    success = update_user_role()

    if success:
        print("\n" + "="*60)
        print("✓ Setup complete!")
        print(f"ℹ  You can now login as admin:")
        print(f"   Email: {USER_EMAIL}")
        print(f"   Password: Admin123!")
        print("="*60 + "\n")
        return 0
    else:
        print("\n❌ Setup failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())
