#!/bin/bash

# ─────────────────────────────────────────
#  SIGMS — Instalar Arranque Automático
#  Corre este script UMA VEZ para o sistema
#  iniciar automaticamente ao ligar o Mac
# ─────────────────────────────────────────

APP_DIR="/Users/joao.pinheiro/Desktop/TESTE"
PLIST_DIR="$HOME/Library/LaunchAgents"
PLIST_SIGMS="$PLIST_DIR/com.elovital.sigms.plist"
PLIST_TUNNEL="$PLIST_DIR/com.elovital.tunnel.plist"

echo "A instalar arranque automático do SIGMS..."
mkdir -p "$PLIST_DIR"

# ── 1. Servidor FastAPI ──────────────────
cat > "$PLIST_SIGMS" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.elovital.sigms</string>
    <key>ProgramArguments</key>
    <array>
        <string>$APP_DIR/.venv/bin/uvicorn</string>
        <string>app.main:app</string>
        <string>--host</string>
        <string>127.0.0.1</string>
        <string>--port</string>
        <string>8000</string>
    </array>
    <key>WorkingDirectory</key>
    <string>$APP_DIR</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>$APP_DIR/data/sigms.log</string>
    <key>StandardErrorPath</key>
    <string>$APP_DIR/data/sigms_error.log</string>
</dict>
</plist>
EOF

# ── 2. Cloudflare Tunnel ─────────────────
cat > "$PLIST_TUNNEL" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.elovital.tunnel</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/cloudflared</string>
        <string>tunnel</string>
        <string>run</string>
        <string>elovital</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>$APP_DIR/data/tunnel.log</string>
    <key>StandardErrorPath</key>
    <string>$APP_DIR/data/tunnel_error.log</string>
</dict>
</plist>
EOF

# Carregar ambos imediatamente
launchctl unload "$PLIST_SIGMS"  2>/dev/null
launchctl unload "$PLIST_TUNNEL" 2>/dev/null
launchctl load "$PLIST_SIGMS"
sleep 2
launchctl load "$PLIST_TUNNEL"

echo ""
echo "Arranque automático instalado com sucesso!"
echo ""
echo "Sempre que ligar o Mac, o SIGMS e o túnel"
echo "iniciam automaticamente — sem fazer nada."
echo ""
echo "Acessivel em: https://elovital-ao.com"
echo "Local:        http://localhost:8000"
echo ""
echo "Para desinstalar: 'desinstalar_arranque_automatico.command'"
echo ""
echo "Prima Enter para fechar..."
read
