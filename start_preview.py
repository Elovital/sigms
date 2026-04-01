"""Preview server startup script — reads PORT from environment."""
import os
import uvicorn

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    port_env = os.environ.get('PORT', 'NOT SET')
    print(f"[start_preview] PORT env={port_env}, starting on port {port}", flush=True)
    with open("/tmp/preview_port_debug.txt", "w") as f:
        f.write(f"PORT env={port_env}, starting on port={port}\n")
    uvicorn.run("app.main:app", host="127.0.0.1", port=port, reload=False)
