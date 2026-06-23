from pydantic import BaseModel
from typing import Dict

class SettingsUpdate(BaseModel):
    settings: Dict[str, str]

class SettingsResponse(BaseModel):
    settings: Dict[str, str]
