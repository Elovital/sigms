#!/usr/bin/env python3
"""
SIGMS ELOVITAL — Exportar base de dados SQLite para JSON.

Usado para migrar dados de SQLite (Render efémero) para PostgreSQL (persistente).

Uso:
    # Exportar dados actuais para ficheiro JSON
    python scripts/export_db.py --out backup_migração.json

    # Depois de configurar PostgreSQL:
    python scripts/import_db.py --in backup_migração.json
"""
import sqlite3
import json
import argparse
import sys
from pathlib import Path
from datetime import datetime

DEFAULT_DB = Path("data/sigms.db")

TABELAS = [
    "users",
    "refresh_tokens",
    "clients",
    "apolices",
    "ramos",
    "seguradoras",
    "sinistros",
    "financeiro",
    "movimentos_financeiros",
    "prospeccao",
    "acompanhamento",
    "audit_log",
    "cotacoes",
    "comparacoes_cotacao",
]


def exportar(db_path: Path, out_path: Path) -> None:
    if not db_path.exists():
        print(f"❌ Base de dados não encontrada: {db_path}", file=sys.stderr)
        sys.exit(1)

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    # Obter lista real de tabelas presentes na BD
    cur.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    tabelas_presentes = {row[0] for row in cur.fetchall()}

    dados = {
        "__meta__": {
            "exportado_em": datetime.now().isoformat(),
            "fonte": str(db_path),
            "versao": "1.0",
        }
    }

    total_registos = 0
    for tabela in TABELAS:
        if tabela not in tabelas_presentes:
            print(f"  ⚠ Tabela '{tabela}' não existe — ignorada")
            continue
        try:
            cur.execute(f"SELECT * FROM {tabela}")
            rows = cur.fetchall()
            dados[tabela] = [dict(row) for row in rows]
            print(f"  ✓ {tabela}: {len(rows)} registos")
            total_registos += len(rows)
        except sqlite3.Error as e:
            print(f"  ⚠ Erro ao ler '{tabela}': {e}")
            dados[tabela] = []

    conn.close()

    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(dados, f, ensure_ascii=False, indent=2, default=str)

    print(f"\n✅ Exportação concluída: {out_path}")
    print(f"   {total_registos} registos exportados de {len(dados)-1} tabelas")
    print(f"   Tamanho: {out_path.stat().st_size / 1024:.1f} KB")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Exportar BD SQLite SIGMS para JSON")
    parser.add_argument("--db", default=str(DEFAULT_DB), help="Caminho para sigms.db")
    parser.add_argument("--out", default="data/backups/migração_export.json", help="Ficheiro de saída JSON")
    args = parser.parse_args()

    print(f"🔍 A exportar base de dados: {args.db}")
    exportar(Path(args.db), Path(args.out))
