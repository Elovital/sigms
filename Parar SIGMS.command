#!/bin/bash

# ─────────────────────────────────────────
#  SIGMS — Parar Servidor
# ─────────────────────────────────────────

PID_FILE="/Users/joao.pinheiro/Desktop/TESTE/.sigms.pid"

if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
        kill "$PID"
        rm "$PID_FILE"
        echo "🛑 Servidor SIGMS parado."
    else
        rm "$PID_FILE"
        echo "⚠️  O servidor já não estava a correr."
    fi
else
    # Tenta parar por nome do processo
    pkill -f "uvicorn app.main:app" 2>/dev/null
    echo "🛑 Servidor SIGMS parado."
fi

echo ""
echo "Prima Enter para fechar..."
read
