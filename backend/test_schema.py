from pydantic import BaseModel
from typing import Optional
import enum

class DeliveryMode(str, enum.Enum):
    ONLINE = "online"
    IN_PERSON = "in_person"
    HYBRID = "hybrid"

class SelfNominationCreate(BaseModel):
    suggested_title: str
    business_reason: str
    expected_outcome: str
    preferred_date: Optional[str] = None
    preferred_mode: DeliveryMode = DeliveryMode.ONLINE
    estimated_cost: float = 0.0

try:
    data = {
        "suggested_title": "ssffng",
        "business_reason": "sfdbc dgb dgg",
        "expected_outcome": "sgsh dghb sgshs",
        "preferred_mode": "online",
        "estimated_cost": 0
    }
    obj = SelfNominationCreate(**data)
    print("Parsed successfully:", obj.model_dump())
except Exception as e:
    print("Validation error:", e)

try:
    data2 = {
        "suggested_title": "ssffng",
        "business_reason": "sfdbc dgb dgg",
        "expected_outcome": "sgsh dghb sgshs",
        "preferred_date": "",
        "preferred_mode": "online",
        "estimated_cost": 0
    }
    obj2 = SelfNominationCreate(**data2)
    print("Parsed with empty string successfully:", obj2.model_dump())
except Exception as e:
    print("Validation error data2:", e)
