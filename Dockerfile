FROM python:3.12-slim

WORKDIR /app

# Instalar dependências do sistema (PostgreSQL client para healthcheck opcional)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Instalar dependências Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar aplicação (excluindo .env, data/, __pycache__ via .dockerignore)
COPY . .

# Criar directório de dados — será sobrescrito pelo volume mount em produção.
# Em Render free (sem volume): o directório existe mas o conteúdo é efémero.
RUN mkdir -p /app/data/backups /app/data/archive

# Declarar /app/data como volume montável (Docker usa volume nomeado se não especificado)
VOLUME ["/app/data"]

EXPOSE 8000

# Ponto de entrada: garantir directorias e arrancar
CMD ["sh", "-c", "mkdir -p /app/data/backups /app/data/archive && uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1"]
