#!/bin/bash
# ══════════════════════════════════════════════════════════════════════════════
# SIGMS ELOVITAL — Deploy automático no Fly.io
#
# Pré-requisitos:
#   - Conta Fly.io criada em fly.io/app/sign-up
#   - Conta Neon criada em neon.tech (base de dados gratuita)
#   - flyctl instalado (este script instala automaticamente)
#
# Uso:
#   bash scripts/deploy_fly.sh
# ══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'
info()    { echo -e "${BLUE}ℹ${NC}  $1"; }
success() { echo -e "${GREEN}✓${NC}  $1"; }
warning() { echo -e "${YELLOW}⚠${NC}  $1"; }
error()   { echo -e "${RED}✗  $1${NC}"; exit 1; }
step()    { echo -e "\n${BOLD}${BLUE}── $1 ──${NC}"; }

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   SIGMS ELOVITAL — Deploy Fly.io                        ║${NC}"
echo -e "${BLUE}║   app.elovital-ao.com                                   ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# ── 1. Instalar flyctl ────────────────────────────────────────────────────────
step "1/6 — flyctl"
if command -v fly &>/dev/null; then
    success "flyctl já instalado: $(fly version | head -1)"
else
    info "A instalar flyctl..."
    curl -L https://fly.io/install.sh | sh
    export PATH="$HOME/.fly/bin:$PATH"
    echo 'export PATH="$HOME/.fly/bin:$PATH"' >> ~/.bashrc 2>/dev/null || true
    echo 'export PATH="$HOME/.fly/bin:$PATH"' >> ~/.zshrc  2>/dev/null || true
    success "flyctl instalado"
fi

# ── 2. Login ──────────────────────────────────────────────────────────────────
step "2/6 — Login Fly.io"
if fly auth whoami &>/dev/null; then
    success "Já autenticado como: $(fly auth whoami)"
else
    info "A abrir browser para login..."
    fly auth login
    success "Login efectuado: $(fly auth whoami)"
fi

# ── 3. Base de dados Neon ─────────────────────────────────────────────────────
step "3/6 — Base de dados PostgreSQL (Neon)"
echo ""
echo -e "  ${YELLOW}Precisamos de uma base de dados PostgreSQL gratuita.${NC}"
echo -e "  ${YELLOW}Vamos usar o Neon (neon.tech) — gratuito, sem expiração.${NC}"
echo ""
echo -e "  ${BOLD}Passos para obter o URL:${NC}"
echo -e "  1. Aceder a ${BLUE}https://neon.tech${NC} → 'Sign Up' (grátis)"
echo -e "  2. Criar projecto: nome 'sigms-elovital', região 'EU Frankfurt'"
echo -e "  3. Em 'Connection Details', seleccionar:"
echo -e "     ${BOLD}Connection string${NC} → ${BOLD}asyncpg${NC}"
echo -e "  4. Copiar o URL (começa com postgresql+asyncpg://...)"
echo ""
read -rp "  Cole o URL do Neon aqui: " DB_URL
[[ -z "$DB_URL" ]] && error "URL da base de dados obrigatório"

# Normalizar URL (aceita postgres://, postgresql://, postgresql+asyncpg://)
if [[ "$DB_URL" == postgres://* ]]; then
    DB_URL="postgresql+asyncpg://${DB_URL#postgres://}"
elif [[ "$DB_URL" == postgresql://* ]] && [[ "$DB_URL" != *"+asyncpg"* ]]; then
    DB_URL="postgresql+asyncpg://${DB_URL#postgresql://}"
fi
success "URL da base de dados configurado"

# ── 4. Criar app no Fly.io ────────────────────────────────────────────────────
step "4/6 — Criar aplicação"
APP_NAME="sigms-elovital"

if fly apps list 2>/dev/null | grep -q "^${APP_NAME}"; then
    success "App '${APP_NAME}' já existe"
else
    # Tentar criar com nome preferido; se ocupado, sugerir alternativa
    if fly apps create "$APP_NAME" --org personal 2>/dev/null; then
        success "App '${APP_NAME}' criada"
    else
        warning "O nome '${APP_NAME}' já está ocupado por outra conta."
        echo ""
        read -rp "  Escolha outro nome (ex: sigms-elovital-2): " APP_NAME
        [[ -z "$APP_NAME" ]] && error "Nome obrigatório"
        fly apps create "$APP_NAME" --org personal
        # Actualizar fly.toml com novo nome
        sed -i.bak "s/^app *= *\"sigms-elovital\"/app = \"${APP_NAME}\"/" fly.toml && rm -f fly.toml.bak
        success "App '${APP_NAME}' criada"
    fi
fi

# ── 5. Configurar secrets ─────────────────────────────────────────────────────
step "5/6 — Segredos e variáveis"
JWT_KEY=$(openssl rand -hex 32 2>/dev/null || python3 -c "import secrets; print(secrets.token_hex(32))")
ENC_KEY=$(openssl rand -hex 32 2>/dev/null || python3 -c "import secrets; print(secrets.token_hex(32))")

info "A definir secrets no Fly.io..."
fly secrets set \
    DATABASE_URL="$DB_URL" \
    JWT_SECRET="$JWT_KEY" \
    ENCRYPTION_KEY="$ENC_KEY" \
    APP_URL="https://app.elovital-ao.com" \
    --app "$APP_NAME"
success "Secrets configurados"

# ── 6. Deploy ─────────────────────────────────────────────────────────────────
step "6/6 — Deploy"
info "A fazer deploy (primeira vez demora ~3-5 minutos)..."
fly deploy --app "$APP_NAME" --ha=false   # --ha=false: usar 1 máquina (free tier)

# ── Domínio personalizado ──────────────────────────────────────────────────────
echo ""
echo -e "${YELLOW}══════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}  Configurar domínio app.elovital-ao.com${NC}"
echo -e "${YELLOW}══════════════════════════════════════════════════════════${NC}"
echo ""
info "A adicionar domínio personalizado..."
fly certs add app.elovital-ao.com --app "$APP_NAME" 2>/dev/null || true

# Obter IPs para DNS
FLY_IPV4=$(fly ips list --app "$APP_NAME" 2>/dev/null | grep "v4" | awk '{print $3}' | head -1 || echo "")
FLY_IPV6=$(fly ips list --app "$APP_NAME" 2>/dev/null | grep "v6" | awk '{print $3}' | head -1 || echo "")

echo ""
echo -e "  ${BOLD}No painel do domínio elovital-ao.com, adicionar:${NC}"
echo ""
[[ -n "$FLY_IPV4" ]] && echo -e "  ${BOLD}Tipo A    | Nome: app | Valor: ${FLY_IPV4}${NC}"
[[ -n "$FLY_IPV6" ]] && echo -e "  ${BOLD}Tipo AAAA | Nome: app | Valor: ${FLY_IPV6}${NC}"
echo ""
echo -e "  ${YELLOW}(Após 5-30 min de propagação DNS, o HTTPS activa automaticamente)${NC}"

# ── Resultado final ────────────────────────────────────────────────────────────
FLY_URL=$(fly info --app "$APP_NAME" 2>/dev/null | grep "Hostname" | awk '{print $2}' || echo "${APP_NAME}.fly.dev")
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✅  Deploy concluído com sucesso!                      ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║                                                          ║${NC}"
echo -e "${GREEN}║   URL temporário : https://${FLY_URL}$(printf '%*s' $((28 - ${#FLY_URL})) '')║${NC}"
echo -e "${GREEN}║   URL definitivo : https://app.elovital-ao.com           ║${NC}"
echo -e "${GREEN}║                                                          ║${NC}"
echo -e "${GREEN}║   Login : admin  |  Senha : Admin@2026!                  ║${NC}"
echo -e "${GREEN}║   ⚠ Mude a senha no primeiro login!                      ║${NC}"
echo -e "${GREEN}║                                                          ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║   Comandos úteis:                                        ║${NC}"
echo -e "${GREEN}║   Logs    : fly logs --app ${APP_NAME}$(printf '%*s' $((20 - ${#APP_NAME})) '')       ║${NC}"
echo -e "${GREEN}║   Deploy  : fly deploy --app ${APP_NAME}$(printf '%*s' $((17 - ${#APP_NAME})) '')     ║${NC}"
echo -e "${GREEN}║   Console : fly ssh console --app ${APP_NAME}$(printf '%*s' $((12 - ${#APP_NAME})) '') ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
