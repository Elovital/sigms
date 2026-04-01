import sys
import os

# Garante que o directório da aplicação está no path do Python
APP_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, APP_DIR)

# Define o caminho absoluto da base de dados
os.environ.setdefault(
    "DATABASE_URL",
    f"sqlite+aiosqlite:///{APP_DIR}/data/sigms.db"
)

# Importa a aplicação FastAPI (ASGI) e converte para WSGI (necessário para o cPanel/Passenger)
from a2wsgi import ASGIMiddleware
from app.main import app as asgi_app

application = ASGIMiddleware(asgi_app)
