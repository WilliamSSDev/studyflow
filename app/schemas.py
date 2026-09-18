from pydantic import BaseModel, EmailStr
from datetime import datetime

class UserRegister(BaseModel):

    name: str
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    name: str
    email: EmailStr

class UserLogin(BaseModel):

    email: str
    password: str

class Card(BaseModel):

    front_content: str
    back_content: str
    deck_id: int | None = None


class DeckCreate(BaseModel):

    name: str
    description: str | None = None


class DeckResponse(BaseModel):

    id: int
    name: str
    description: str | None = None
    total_cards: int = 0
    pending_cards: int = 0
    studied_cards: int = 0

