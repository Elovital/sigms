#!/bin/bash

# ─────────────────────────────────────────
#  SIGMS — Desinstalar Arranque Automático
# ─────────────────────────────────────────

PLIST_DIR="$HOME/Library/LaunchAgents"
PLIST_SIGMS="$PLIST_DIR/com.elovital.sigms.plist"
PLIST_TUNNEL="$PLIST_DIR/com.elovital.tunnel.plist"

[ -f "$PLIST_SIGMS" ]  && launchctl unload "$PLIST_SIGMS"  && rm "$PLIST_SIGMS"
[ -f "$PLIST_TUNNEL" ] && launchctl unload "$PLIST_TUNNEL" && rm "$PLIST_TUNNEL"

pkill -f "uvicorn app.main:app" 2>/dev/null
pkill -f "cloudflared tunnel run" 2>/dev/null

echo "Arranque automatico removido."
echo "O SIGMS ja nao iniciara automaticamente."
echo ""
echo "Prima Enter para fechar..."
read
