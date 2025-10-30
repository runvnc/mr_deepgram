from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
from lib.templates import render
from loguru import logger
from dotenv import load_dotenv
import os
import json
import requests
load_dotenv(override=True)

DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY")
DEEPGRAM_PROJECT_ID = os.getenv("DEEPGRAM_PROJECT_ID")

router = APIRouter()

@router.get("/deepgram/tempkey", response_class=HTMLResponse)
async def get_tempkey(request: Request):
    user = request.state.user if hasattr(request.state, "user") else {"username": "guest"}
    url = f"https://api.deepgram.com/v1/projects/{DEEPGRAM_PROJECT_ID}/keys"

    payload = {
        "comment": "temp live (dev)",
        "scopes": ["usage:write", "usage:read", "project:write", "project:read"],
        "time_to_live_in_seconds": 60*60*6
    }

    headers = {
        "authorization": f"Token {DEEPGRAM_API_KEY}",
        "accept": "application/json",
        "content-type": "application/json"
    }
    response = requests.post(url, headers=headers, json=payload)
    data = json.loads(response.text)
    
    print(data)
    return data["key"]

@router.get("/deepgram/toggle-mode", response_class=JSONResponse)
async def get_toggle_mode(request: Request):
    """Check if toggle mode is enabled via environment variable."""
    toggle_mode_env = os.getenv("DEEPGRAM_TOGGLE_MODE", "").lower()
    # Check for common truthy values
    is_enabled = toggle_mode_env in ['true', 'yes', 'on', '1']
    return {
        "enabled": is_enabled
    }
+