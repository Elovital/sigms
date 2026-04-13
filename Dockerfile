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

CMD mkdir -p /app/data/backups /app/data/archive && \
    uvicorn app.main:app --host 0.0.0.0 --port 8000
