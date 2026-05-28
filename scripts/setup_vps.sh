#!/bin/bash
# ══════════════════════════════════════════════════════════════════════════════
# SIGMS ELOVITAL — Script de instalação em VPS Ubuntu 22.04/24.04
#
# Uso (como root ou com sudo):
#   curl -fsSL https://raw.githubusercontent.com/Elovital/sigms/main/scripts/setup_vps.sh | bash
#
#   OU após clonar o repositório:
#   chmod +x scripts/setup_vps.sh && sudo bash scripts/setup_vps.sh
#
# O script:
#   1. Actualiza o sistema
#   2. Instala Docker e Docker Compose
#   3. Clona o repositório SIGMS
#   4. Gera chaves de segurança aleatórias
#   5. Pede as configurações essenciais (domínio, passwords)
#   6. Inicia o sistema com HTTPS automático
# ══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

# Cores para output
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

info()    { echo -e "${BLUE}ℹ${NC}  $1"; }
success() { echo -e "${GREEN}✓${NC}  $1"; }
warning() { echo -e "${YELLOW}⚠${NC}  $1"; }
error()   { echo -e "${RED}✗${NC}  $1"; exit 1; }

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  SIGMS ELOVITAL — Instalação em VPS Ubuntu              ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# ── Verificar root ─────────────────────────────────────────────────────────
if [[ $EUID -ne 0 ]]; then
    error "Execute como root: sudo bash scripts/setup_vps.sh"
fi

# ── 1. Actualizar sistema ──────────────────────────────────────────────────
info "A actualizar o sistema..."
apt-get update -qq && apt-get upgrade -y -qq
apt-get install -y -qq git curl wget unzip nano
success "Sistema actualizado"

# ── 2. Instalar Docker ────────────────────────────────────────────────────
if command -v docker &>/dev/null; then
    success "Docker já instalado: $(docker --version)"
else
    info "A instalar Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
    success "Docker instalado: $(docker --version)"
fi

# Adicionar utilizador actual ao grupo docker (se não for root)
if [[ -n "${SUDO_USER:-}" ]]; then
    usermod -aG docker "$SUDO_USER"
    info "Utilizador '$SUDO_USER' adicionado ao grupo docker"
fi

# ── 3. Clonar repositório ─────────────────────────────────────────────────
INSTALL_DIR="/opt/sigms"
if [[ -d "$INSTALL_DIR/.git" ]]; then
    info "Repositório já existe em $INSTALL_DIR — a actualizar..."
    git -C "$INSTALL_DIR" pull origin main
    success "Repositório actualizado"
else
    info "A clonar repositório SIGMS para $INSTALL_DIR..."
    git clone https://github.com/Elovital/sigms.git "$INSTALL_DIR"
    success "Repositório clonado"
fi

cd "$INSTALL_DIR"
mkdir -p backups

# ── 4. Configurar .env ────────────────────────────────────────────────────
echo ""
echo -e "${YELLOW}══════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}  Configuração essencial${NC}"
echo -e "${YELLOW}══════════════════════════════════════════════════════════${NC}"

if [[ -f ".env" ]]; then
    warning ".env já existe — a usar configuração existente"
    warning "Para reconfigurar: nano $INSTALL_DIR/.env"
else
    # Gerar chaves seguras automaticamente
    JWT_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))" 2>/dev/null || openssl rand -hex 32)
    ENC_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))" 2>/dev/null || openssl rand -hex 32)
    DB_PASS=$(python3 -c "import secrets; print(secrets.token_urlsafe(24))" 2>/dev/null || openssl rand -base64 24 | tr -d '=/+')

    # Pedir domínio
    echo ""
    read -rp "  Domínio do sistema (ex: sigms.elovital-ao.com): " DOMINIO
    [[ -z "$DOMINIO" ]] && error "Domínio obrigatório"

    # Criar .env
    cat > .env << ENVEOF
# SIGMS ELOVITAL — Configuração de produção
# Gerado automaticamente em $(date)

DOMINIO=${DOMINIO}
APP_URL=https://${DOMINIO}

POSTGRES_PASSWORD=${DB_PASS}

JWT_SECRET=${JWT_KEY}
ENCRYPTION_KEY=${ENC_KEY}

# Email (preencher para activar recuperação de senha)
BREVO_API_KEY=
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=cotacao@elovital-ao.com
SMTP_FROM_NAME=ELOVITAL - Mediacao de Seguros
ENVEOF

    success ".env criado com chaves de segurança geradas automaticamente"
    info "Password da BD gerada: ${DB_PASS:0:8}..."
    info "Para ver todas as configurações: nano $INSTALL_DIR/.env"
fi

# ── 5. Verificar DNS ──────────────────────────────────────────────────────
DOMINIO_CONF=$(grep "^DOMINIO=" .env | cut -d= -f2)
if [[ -n "$DOMINIO_CONF" ]]; then
    echo ""
    info "A verificar DNS para '$DOMINIO_CONF'..."
    VPS_IP=$(curl -s4 ifconfig.me 2>/dev/null || curl -s4 icanhazip.com 2>/dev/null || echo "desconhecido")
    DNS_IP=$(dig +short "$DOMINIO_CONF" A 2>/dev/null | tail -1 || nslookup "$DOMINIO_CONF" 2>/dev/null | grep "Address:" | tail -1 | awk '{print $2}' || echo "")

    echo ""
    echo -e "  IP deste servidor : ${GREEN}${VPS_IP}${NC}"
    echo -e "  IP do DNS         : ${DNS_IP:-${RED}não resolvido${NC}}"
    echo ""

    if [[ "$DNS_IP" == "$VPS_IP" ]]; then
        success "DNS configurado correctamente!"
    else
        warning "DNS ainda não aponta para este servidor."
        warning "No painel do seu domínio, crie um registo A:"
        echo ""
        echo -e "  ${YELLOW}Tipo: A${NC}"
        echo -e "  ${YELLOW}Nome: ${DOMINIO_CONF}${NC}"
        echo -e "  ${YELLOW}Valor: ${VPS_IP}${NC}"
        echo -e "  ${YELLOW}TTL: 300${NC}"
        echo ""
        warning "Aguarde a propagação DNS (pode demorar até 30 min) antes de continuar."
        read -rp "  Continuar mesmo assim? (s/N): " CONTINUAR
        [[ "${CONTINUAR,,}" != "s" ]] && { info "A instalação foi pausada. Execute novamente quando o DNS estiver configurado."; exit 0; }
    fi
fi

# ── 6. Abrir firewall ─────────────────────────────────────────────────────
if command -v ufw &>/dev/null; then
    info "A configurar firewall (UFW)..."
    ufw allow 22/tcp   comment 'SSH'    2>/dev/null || true
    ufw allow 80/tcp   comment 'HTTP'   2>/dev/null || true
    ufw allow 443/tcp  comment 'HTTPS'  2>/dev/null || true
    ufw --force enable 2>/dev/null || true
    success "Firewall configurado (SSH + HTTP + HTTPS)"
fi

# ── 7. Arrancar sistema ───────────────────────────────────────────────────
echo ""
info "A construir e arrancar SIGMS (pode demorar 2-3 minutos na primeira vez)..."
docker compose -f docker-compose.prod.yml up -d --build

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✅  SIGMS ELOVITAL instalado com sucesso!               ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║                                                          ║${NC}"
echo -e "${GREEN}║  URL: https://${DOMINIO_CONF:-SEU-DOMINIO}$(printf '%*s' $((40 - ${#DOMINIO_CONF:-SEU-DOMINIO})) '')║${NC}"
echo -e "${GREEN}║  Utilizador: admin                                       ║${NC}"
echo -e "${GREEN}║  Password:   Admin@2026!                                 ║${NC}"
echo -e "${GREEN}║                                                          ║${NC}"
echo -e "${GREEN}║  ⚠ Mude a password do admin após o primeiro login!       ║${NC}"
echo -e "${GREEN}║                                                          ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║  Comandos úteis:                                         ║${NC}"
echo -e "${GREEN}║  Logs:    docker compose -f ${INSTALL_DIR}/docker-compose.prod.yml logs -f  ║${NC}"
echo -e "${GREEN}║  Parar:   docker compose -f ${INSTALL_DIR}/docker-compose.prod.yml down     ║${NC}"
echo -e "${GREEN}║  Update:  cd ${INSTALL_DIR} && git pull && docker compose -f docker-compose.prod.yml up -d --build ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
