
from pydantic import BaseModel

class UserResponseDTO(BaseModel):
    id: int
    nome: str
    email: str
