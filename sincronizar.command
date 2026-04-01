#!/bin/bash

# ─────────────────────────────────────────
#  SIGMS — Sincronizar TESTE → SIGMS
#  Copia todas as alterações de código para
#  o servidor em produção e reinicia
# ─────────────────────────────────────────

ORIGEM="/Users/joao.pinheiro/Desktop/TESTE"
DESTINO="/Users/joao.pinheiro/SIGMS"

echo "A sincronizar alterações para produção..."
echo ""

# Copiar código da aplicação (excluindo dados e ambiente virtual)
rsync -av --delete \
  --exclude='.venv/' \
  --exclude='data/' \
  --exclude='__pycache__/' \
  --exclude='*.pyc' \
  --exclude='.DS_Store' \
  --exclude='*.command' \
  --exclude='sincronizar.command' \
  --exclude='instalar_arranque_automatico.command' \
  --exclude='desinstalar_arranque_automatico.command' \
  --exclude='start_server.sh' \
  "$ORIGEM/" "$DESTINO/"

echo ""
echo "A reiniciar o servidor..."

launchctl unload ~/Library/LaunchAgents/com.elovital.sigms.plist 2>/dev/null
sleep 2
launchctl load ~/Library/LaunchAgents/com.elovital.sigms.plist
sleep 3

# Verificar se o servidor está a responder
if curl -s http://localhost:8000/health | grep -q "ok"; then
    echo ""
    echo "✅ Sincronização concluída com sucesso!"
    echo "🌐 Sistema disponível em: https://elovital-ao.com"
else
    echo ""
    echo "⚠️  Servidor não respondeu. Verifique os logs:"
    echo "   cat /Users/joao.pinheiro/SIGMS/data/sigms_error.log"
fi

echo ""
echo "Prima Enter para fechar..."
read
