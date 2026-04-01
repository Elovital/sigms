#!/usr/bin/env python3
"""
Migration: add must_change_password, password_reset_token, password_reset_expires to users table.
Also resets all user passwords to the default password and sets must_change_password = 1.

Run from the project root:
    python scripts/migrate_password_reset.py
"""
import sqlite3
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

import bcrypt

DEFAULT_PASSWORD = "Sigms@2026!"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def migrate():
    db_path = Path("data/sigms.db")
    if not db_path.exists():
        print(f"[ERROR] Database not found at {db_path}. Run the app first to create it.")
        sys.exit(1)

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    # Check existing columns
    cur.execute("PRAGMA table_info(users)")
    existing_cols = {row[1] for row in cur.fetchall()}

    # Add must_change_password column
    if "must_change_password" not in existing_cols:
        cur.execute("ALTER TABLE users ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 1")
        print("[OK] Added column: must_change_password")
    else:
        print("[SKIP] Column already exists: must_change_password")

    # Add password_reset_token column
    if "password_reset_token" not in existing_cols:
        cur.execute("ALTER TABLE users ADD COLUMN password_reset_token TEXT")
        print("[OK] Added column: password_reset_token")
    else:
        print("[SKIP] Column already exists: password_reset_token")

    # Add password_reset_expires column
    if "password_reset_expires" not in existing_cols:
        cur.execute("ALTER TABLE users ADD COLUMN password_reset_expires TEXT")
        print("[OK] Added column: password_reset_expires")
    else:
        print("[SKIP] Column already exists: password_reset_expires")

    # Reset all passwords to default and set must_change_password = 1
    cur.execute("SELECT id, username FROM users")
    users = cur.fetchall()
    print(f"\nResetting passwords for {len(users)} user(s) to default: {DEFAULT_PASSWORD}")
    hashed = hash_password(DEFAULT_PASSWORD)
    for user_id, username in users:
        cur.execute(
            "UPDATE users SET hashed_password = ?, must_change_password = 1 WHERE id = ?",
            (hashed, user_id),
        )
        print(f"  [OK] {username} (id={user_id}) — senha redefinida")

    conn.commit()
    conn.close()
    print("\n[DONE] Migração concluída com sucesso.")
    print(f"       Senha padrão: {DEFAULT_PASSWORD}")
    print("       Todos os utilizadores deverão alterar a senha no primeiro acesso.")


if __name__ == "__main__":
    migrate()
