#!/bin/bash
# ══════════════════════════════════════════════════════════════════════════════
# SIGMS ELOVITAL — Instalação em Ubuntu 22.04/24.04
# Compatível com: Oracle Cloud Free, DigitalOcean, Hetzner, qualquer VPS Ubuntu
#
# Uso (como root ou com sudo):
#   curl -fsSL https://raw.githubusercontent.com/Elovital/sigms/main/scripts/setup_vps.sh | sudo bash
# ══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'

info()    { echo -e "${BLUE}ℹ${NC}  $1"; }
success() { echo -e "${GREEN}✓${NC}  $1"; }
warning() { echo -e "${YELLOW}⚠${NC}  $1"; }
error()   { echo -e "${RED}✗  ERRO: $1${NC}"; exit 1; }
step()    { echo -e "\n${BOLD}${BLUE}── $1 ──${NC}"; }

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   SIGMS ELOVITAL — Instalação Automática                ║${NC}"
echo -e "${BLUE}║   app.elovital-ao.com                                   ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

[[ $EUID -ne 0 ]] && error "Execute com sudo: sudo bash scripts/setup_vps.sh"

# ── 1. Sistema ────────────────────────────────────────────────────────────────
step "1/7 — Actualizar sistema"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get upgrade -y -qq -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold"
apt-get install -y -qq git curl wget nano dnsutils netfilter-persistent iptables-persistent
success "Sistema actualizado"

# ── 2. Docker ─────────────────────────────────────────────────────────────────
step "2/7 — Docker"
if command -v docker &>/dev/null; then
    success "Docker já instalado: $(docker --version | cut -d' ' -f3 | tr -d ',')"
else
    info "A instalar Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker --now
    success "Docker instalado: $(docker --version | cut -d' ' -f3 | tr -d ',')"
fi
[[ -n "${SUDO_USER:-}" ]] && usermod -aG docker "$SUDO_USER" && info "Utilizador '$SUDO_USER' adicionado ao grupo docker"

# ── 3. Firewall ───────────────────────────────────────────────────────────────
step "3/7 — Firewall"

# UFW (camada standard)
if command -v ufw &>/dev/null; then
    ufw allow 22/tcp   comment 'SSH'   >/dev/null 2>&1 || true
    ufw allow 80/tcp   comment 'HTTP'  >/dev/null 2>&1 || true
    ufw allow 443/tcp  comment 'HTTPS' >/dev/null 2>&1 || true
    ufw --force enable >/dev/null 2>&1 || true
    success "UFW configurado (22, 80, 443)"
fi

# Oracle Cloud: as imagens Ubuntu têm regras iptables extra que bloqueiam 80/443
# mesmo quando o UFW está aberto. Detectar e corrigir automaticamente.
IS_ORACLE=false
if curl -sf --max-time 2 http://169.254.169.254/opc/v1/instance/ &>/dev/null || \
   [[ -f /etc/oracle-cloud-agent/agent_conf.yml ]] || \
   grep -qi "oracle" /sys/class/dmi/id/chassis_vendor 2>/dev/null; then
    IS_ORACLE=true
fi

# Mesmo sem Oracle, garantir que as regras INPUT aceitam 80/443
# (seguro em qualquer Ubuntu — não interfere com outras configurações)
_open_port() {
    local PORT=$1
    if ! iptables -C INPUT -p tcp --dport "$PORT" -j ACCEPT 2>/dev/null; then
        # Inserir antes da regra DROP final (posição 6 é convencional no Oracle)
        iptables -I INPUT 6 -m state --state NEW -p tcp --dport "$PORT" -j ACCEPT 2>/dev/null || \
        iptables -A INPUT -p tcp --dport "$PORT" -j ACCEPT 2>/dev/null || true
    fi
}
_open_port 80
_open_port 443

# Persistir regras iptables
netfilter-persistent save >/dev/null 2>&1 || iptables-save > /etc/iptables/rules.v4 2>/dev/null || true

if $IS_ORACLE; then
    success "Oracle Cloud detectado — regras iptables para portas 80/443 adicionadas"
else
    success "Regras iptables configuradas"
fi

# ── 4. Repositório ────────────────────────────────────────────────────────────
step "4/7 — Repositório SIGMS"
INSTALL_DIR="/opt/sigms"
if [[ -d "$INSTALL_DIR/.git" ]]; then
    info "Repositório já existe — a actualizar para última versão..."
    git -C "$INSTALL_DIR" pull origin main
    success "Repositório actualizado"
else
    git clone https://github.com/Elovital/sigms.git "$INSTALL_DIR"
    success "Repositório clonado para $INSTALL_DIR"
fi
cd "$INSTALL_DIR"
mkdir -p backups

# ── 5. Configuração ───────────────────────────────────────────────────────────
step "5/7 — Configuração"

if [[ -f ".env" ]]; then
    warning ".env já existe — a manter configuração existente"
    warning "Para alterar: nano $INSTALL_DIR/.env && docker compose -f docker-compose.prod.yml up -d --build"
else
    # Gerar chaves seguras
    JWT_KEY=$(openssl rand -hex 32)
    ENC_KEY=$(openssl rand -hex 32)
    DB_PASS=$(openssl rand -base64 18 | tr -d '=/+' | head -c 24)

    echo ""
    echo -e "  ${BOLD}Qual é o domínio do sistema?${NC}"
    echo -e "  ${YELLOW}(Ex: app.elovital-ao.com)${NC}"
    echo ""
    read -rp "  Domínio: " DOMINIO
    [[ -z "$DOMINIO" ]] && error "Domínio é obrigatório"
    # Remover http:// ou https:// se o utilizador o incluiu
    DOMINIO="${DOMINIO#https://}"; DOMINIO="${DOMINIO#http://}"; DOMINIO="${DOMINIO%/}"

    cat > .env << ENVEOF
# SIGMS ELOVITAL — Configuração de produção
# Gerado em: $(date '+%Y-%m-%d %H:%M')

DOMINIO=${DOMINIO}
APP_URL=https://${DOMINIO}

# Base de dados PostgreSQL (gerida pelo docker-compose — não alterar)
POSTGRES_PASSWORD=${DB_PASS}

# Chaves de segurança (geradas automaticamente — NÃO partilhar)
JWT_SECRET=${JWT_KEY}
ENCRYPTION_KEY=${ENC_KEY}

# Email — preencher para activar recuperação de senha
BREVO_API_KEY=
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=info@elovital-ao.com
SMTP_FROM_NAME=ELOVITAL - Mediacao de Seguros
ENVEOF

    success ".env criado com chaves de segurança aleatórias"
fi

DOMINIO_CONF=$(grep "^DOMINIO=" .env | cut -d= -f2 | tr -d ' ')

# ── 6. Verificar DNS ──────────────────────────────────────────────────────────
step "6/7 — Verificar DNS"
VPS_IP=$(curl -s4 --max-time 5 ifconfig.me 2>/dev/null || curl -s4 --max-time 5 icanhazip.com 2>/dev/null || echo "N/A")
DNS_IP=$(dig +short +time=3 "$DOMINIO_CONF" A 2>/dev/null | grep -E '^[0-9]+\.' | tail -1 || echo "")

echo ""
echo -e "  IP deste servidor  :  ${GREEN}${BOLD}${VPS_IP}${NC}"
echo -e "  IP do DNS          :  ${DNS_IP:-${YELLOW}(ainda não configurado)${NC}}"
echo ""

if [[ -n "$DNS_IP" && "$DNS_IP" == "$VPS_IP" ]]; then
    success "DNS correcto! O domínio já aponta para este servidor."
    DNS_OK=true
else
    DNS_OK=false
    warning "O DNS ainda não aponta para este servidor."
    echo ""
    echo -e "  ${YELLOW}No painel do domínio ${BOLD}elovital-ao.com${NC}${YELLOW}, criar:${NC}"
    echo ""
    echo -e "  ${BOLD}  Tipo  :  A${NC}"
    echo -e "  ${BOLD}  Nome  :  app${NC}   ${YELLOW}(resulta em app.elovital-ao.com)${NC}"
    echo -e "  ${BOLD}  Valor :  ${VPS_IP}${NC}"
    echo -e "  ${BOLD}  TTL   :  300${NC}"
    echo ""
    warning "O certificado HTTPS só funciona após a propagação do DNS (até 30 min)."
    echo ""
    read -rp "  Continuar a instalação agora mesmo? (s/N): " CONT
    [[ "${CONT,,}" != "s" ]] && {
        echo ""
        info "Instalação pausada."
        info "Quando o DNS estiver configurado, volte a executar:"
        echo -e "  ${BOLD}sudo bash $INSTALL_DIR/scripts/setup_vps.sh${NC}"
        exit 0
    }
fi

# ── 7. Arrancar ───────────────────────────────────────────────────────────────
step "7/7 — Arrancar SIGMS"
info "A construir imagem Docker e arrancar serviços..."
info "(Primeira vez pode demorar 2-4 minutos — a descarregar imagens...)"
echo ""
docker compose -f docker-compose.prod.yml up -d --build
echo ""

# Aguardar healthcheck da aplicação
info "A aguardar arranque da aplicação..."
MAX=30; C=0
until docker compose -f docker-compose.prod.yml exec -T app \
      python3 -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health', timeout=3)" \
      >/dev/null 2>&1 || [[ $C -ge $MAX ]]; do
    sleep 3; C=$((C+1)); echo -n "."
done
echo ""

# ── Resumo final ──────────────────────────────────────────────────────────────
PAD=$((44 - ${#DOMINIO_CONF}))
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✅  SIGMS ELOVITAL instalado com sucesso!              ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║                                                          ║${NC}"
printf "${GREEN}║   URL     :  https://%-${PAD}s║${NC}\n" "${DOMINIO_CONF}"
echo -e "${GREEN}║   Login   :  admin                                       ║${NC}"
echo -e "${GREEN}║   Senha   :  Admin@2026!                                 ║${NC}"
echo -e "${GREEN}║                                                          ║${NC}"
echo -e "${GREEN}║   ⚠  Mude a senha do admin no primeiro login!            ║${NC}"
echo -e "${GREEN}║                                                          ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║   Comandos úteis (executar em /opt/sigms):               ║${NC}"
echo -e "${GREEN}║                                                          ║${NC}"
echo -e "${GREEN}║   Ver logs :  docker compose -f docker-compose.prod.yml logs -f   ║${NC}"
echo -e "${GREEN}║   Parar    :  docker compose -f docker-compose.prod.yml down      ║${NC}"
echo -e "${GREEN}║   Actualizar:                                            ║${NC}"
echo -e "${GREEN}║     git pull && docker compose -f docker-compose.prod.yml up -d --build  ║${NC}"
echo -e "${GREEN}║   Backup   :  docker compose -f docker-compose.prod.yml  ║${NC}"
echo -e "${GREEN}║     exec db pg_dump -U sigms sigms > backups/manual.sql ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

$DNS_OK || warning "Lembre-se de configurar o DNS: app → ${VPS_IP}  (ver instruções acima)"
echo ""
