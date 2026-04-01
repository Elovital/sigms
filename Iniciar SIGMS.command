#!/bin/bash

# ─────────────────────────────────────────
#  SIGMS — Iniciar Servidor + Túnel
# ─────────────────────────────────────────

APP_DIR="/Users/joao.pinheiro/Desktop/TESTE"
PID_FILE="$APP_DIR/.sigms.pid"
TUNNEL_PID="$APP_DIR/.tunnel.pid"

# Verificar se já está a correr
if [ -f "$PID_FILE" ] && kill -0 "$(cat $PID_FILE)" 2>/dev/null; then
    echo "O servidor ja esta a correr."
    echo "Local:  http://localhost:8000"
    echo "Online: https://elovital-ao.com"
    echo ""
    echo "Prima Enter para fechar..."
    read
    exit 0
fi

echo "A iniciar o SIGMS..."
cd "$APP_DIR"
source .venv/bin/activate

# Iniciar servidor
uvicorn app.main:app --host 127.0.0.1 --port 8000 &
echo $! > "$PID_FILE"

sleep 2

# Iniciar túnel Cloudflare (se estiver instalado)
if command -v cloudflared &>/dev/null; then
    cloudflared tunnel run elovital &
    echo $! > "$TUNNEL_PID"
    echo ""
    echo "Servidor e tunel iniciados!"
    echo "Online: https://elovital-ao.com"
else
    echo ""
    echo "Servidor iniciado!"
    echo "Local: http://localhost:8000"
    echo "(cloudflared nao instalado — apenas acesso local)"
fi

echo ""
echo "NAO FECHE ESTA JANELA enquanto usar o sistema."
echo "Pode minimiza-la."
echo ""

wait
