import os
import httpx
import uvicorn
import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, JSONResponse
from pydantic import BaseModel, Field, ConfigDict
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO, format="[CloudVoice] %(levelname)s: %(message)s")
logger = logging.getLogger("server")

ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
if not ELEVENLABS_API_KEY:
    logger.error("ELEVENLABS_API_KEY is missing from .env file.")

app = FastAPI(title="CloudVoice Chrome API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"chrome-extension://.*",
    allow_origins=["http://localhost:8001", "http://127.0.0.1:8001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TTSRequest(BaseModel):
    model_config = ConfigDict(strict=True)
    text: str = Field(..., min_length=1, max_length=10000)
    voice: str = Field(default="21m00Tcm4TlvDq8ikWAM") 
    speed: float = Field(default=1.0, ge=0.5, le=2.0)
    response_format: str = Field(default="mp3")

@app.get("/health")
async def health() -> dict:
    return {
        "status": "ok",
        "server": "CloudVoice Proxy",
        "api_key_configured": bool(ELEVENLABS_API_KEY),
        "engine": "ElevenLabs Cloud",
        "device": "Remote"
    }

@app.get("/voices")
async def list_voices() -> JSONResponse:
    if not ELEVENLABS_API_KEY:
        raise HTTPException(status_code=500, detail="API key not configured")
        
    url = "https://api.elevenlabs.io/v1/voices"
    headers = {"xi-api-key": ELEVENLABS_API_KEY}
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=headers)
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail="Failed to fetch voices from ElevenLabs")
            
        data = response.json()
        voices = []
        for voice in data.get("voices", []):
            voices.append({
                "name": voice.get("name"),
                "filename": voice.get("voice_id"), 
                "format": "cloud"
            })
        return JSONResponse({"voices": voices})

@app.post("/tts")
async def tts_endpoint(req: TTSRequest):
    if not ELEVENLABS_API_KEY:
        raise HTTPException(status_code=500, detail="API key not configured")

    url = f"https://api.elevenlabs.io/v1/text-to-speech/{req.voice}"
    headers = {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": ELEVENLABS_API_KEY
    }
    
    payload = {
        "text": req.text,
        "model_id": "eleven_flash_v2_5",
        "voice_settings": {
            "stability": 0.5,
            "similarity_boost": 0.75
        }
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=payload, headers=headers, timeout=30.0)
        
        if response.status_code != 200:
            logger.error(f"ElevenLabs error: {response.text}")
            raise HTTPException(status_code=response.status_code, detail="ElevenLabs synthesis failed")
            
        audio_bytes = response.content

    import base64
    if req.response_format == "base64":
        return JSONResponse({
            "audio_base64": base64.b64encode(audio_bytes).decode("ascii"),
            "format": "mp3"
        })

    return Response(
        content=audio_bytes,
        media_type="audio/mpeg"
    )

if __name__ == "__main__":
    uvicorn.run("server:app", host="127.0.0.1", port=8001, reload=False, log_level="info")