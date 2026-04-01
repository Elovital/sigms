from app.models.user import User, RefreshToken
from app.models.client import Client, Contact, RgpdConsentLog
from app.models.apolice import Apolice, Seguradora, Ramo
from app.models.financeiro import Premio, Pagamento, Comissao
from app.models.risco import RiscoAuto, RiscoSaudeVida, Beneficiario, RiscoEmpresa
from app.models.sinistro import Sinistro, SinistroDoc
from app.models.audit import AuditLog
from app.models.acompanhamento import Interacao
from app.models.prospeccao import Prospeccao

__all_models__ = [
    User, RefreshToken, Client, Contact, RgpdConsentLog,
    Apolice, Seguradora, Ramo, Premio, Pagamento, Comissao,
    RiscoAuto, RiscoSaudeVida, Beneficiario, RiscoEmpresa,
    Sinistro, SinistroDoc, AuditLog, Interacao, Prospeccao,
]
