FROM python:3.12-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Create data directory (local dev)
RUN mkdir -p data/backups data/archive

EXPOSE 8000

# Point the database to the Render persistent disk at /data/sigms.db
# Create symlinks so relative paths (./data/*) resolve to the persistent mount
CMD mkdir -p /data/backups /data/archive && \
    mkdir -p /app/data && \
    ln -sf /data/sigms.db /app/data/sigms.db && \
    ln -sf /data/backups /app/data/backups && \
    ln -sf /data/archive /app/data/archive && \
    uvicorn app.main:app --host 0.0.0.0 --port 8000
