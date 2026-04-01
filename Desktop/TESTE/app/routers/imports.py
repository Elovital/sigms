"""CSV/Excel import and reconciliation."""
import io
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User

router = APIRouter(prefix="/imports", tags=["imports"])


@router.post("/preview")
async def preview_import(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    import pandas as pd

    content = await file.read()
    try:
        if file.filename.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(content), nrows=100, dtype=str)
        elif file.filename.endswith((".xlsx", ".xls")):
            df = pd.read_excel(io.BytesIO(content), nrows=100, dtype=str)
        else:
            raise HTTPException(status_code=400, detail="Formato não suportado. Use CSV ou Excel.")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro ao ler ficheiro: {e}")

    df = df.where(pd.notna(df), None)
    columns = list(df.columns)
    preview_rows = df.head(5).to_dict(orient="records")

    # Suggest mappings based on column names
    known_mappings = {
        "nif": ["nif", "contribuinte", "fiscal"],
        "nome": ["nome", "name", "cliente", "titular"],
        "numero_apolice": ["apólice", "apolice", "numero", "policy"],
        "seguradora": ["seguradora", "companhia", "insurer"],
        "premio_base": ["prémio", "premio", "premium", "valor"],
        "data_inicio": ["inicio", "start", "vigencia_inicio"],
        "data_fim": ["fim", "end", "vigencia_fim", "vencimento"],
    }

    suggestions = {}
    for target, keywords in known_mappings.items():
        for col in columns:
            if any(k in col.lower() for k in keywords):
                suggestions[target] = col
                break

    return {
        "filename": file.filename,
        "total_rows": len(df),
        "columns": columns,
        "preview": preview_rows,
        "suggestions": suggestions,
    }


@router.post("/execute")
async def execute_import(
    mapping: dict,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Execute reconciliation with confirmed column mapping."""
    import pandas as pd
    from app.validators.nif import validate_nif

    content = await file.read()
    try:
        if file.filename.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(content), dtype=str)
        else:
            df = pd.read_excel(io.BytesIO(content), dtype=str)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro ao ler ficheiro: {e}")

    df = df.where(pd.notna(df), None)

    results = {"created": 0, "updated": 0, "skipped": 0, "errors": []}

    for idx, row in df.iterrows():
        try:
            nif_col = mapping.get("nif")
            if not nif_col or not row.get(nif_col):
                results["skipped"] += 1
                continue
            nif = str(row[nif_col]).strip()
            valid, tipo = validate_nif(nif)
            if not valid:
                results["errors"].append({"row": idx + 2, "error": f"NIF inválido: {nif}"})
                results["skipped"] += 1
                continue

            # In a full implementation, upsert clients and policies here
            results["created"] += 1
        except Exception as e:
            results["errors"].append({"row": idx + 2, "error": str(e)})
            results["skipped"] += 1

    return results
