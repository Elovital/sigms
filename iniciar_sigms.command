#!/bin/bash
cd "$(dirname "$0")"
echo "🛡️  A iniciar SIGMS..."
echo "   Acede em: http://localhost:8000"
echo "   Credenciais: admin / Admin@2026!"
echo "   (Ctrl+C para parar)"
echo ""
.venv/bin/uvicorn app.main:app --port 8000
