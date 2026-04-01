#!/bin/bash
cd /Users/joao.pinheiro/Desktop/TESTE
source /Users/joao.pinheiro/Desktop/TESTE/.venv/bin/activate
exec /Users/joao.pinheiro/Desktop/TESTE/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
