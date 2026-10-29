from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.DTOs.UserResponseDTO import UserResponseDTO
from app.dependencies import verify_token, get_session
from app.models import User
from app.DTOs.UserResponseDTO import UserResponseDTO

user_route = APIRouter(prefix="/user", tags=['user'])
@user_route.get(path="/me", response_model=UserResponseDTO)
async def get_user(usuario: User = Depends(verify_token)):

    user_dto = UserResponseDTO(
        id=usuario.id,
        nome=usuario.name,
        email=usuario.email
    )

    return user_dto
@user_route.delete(path="/{user_id}")
async def delete_user(user_id: int, session: Session = Depends(get_session), usuario: User = Depends(verify_token)):

    if not usuario.admin:

        raise HTTPException(
            status_code=403,
            detail="Admin privileges required."
        )
    
        #Forbidden action: user is not an admin.
    
    # Get user to delete from database.
    usuario = session.query(User).filter(User.id==user_id).first()

    if not usuario:

        raise HTTPException(
            status_code=404,
            detail="User not found."
        )
    
    #User has not been found in the database.
    
    elif usuario.admin:
        raise HTTPException(
            status_code=403,
            detail="Admin users cannot be deleted."
        )
    
    session.delete(usuario)
    session.commit()

    return {"message": f"Deleted user {usuario.id} from database."}

async def update_user(user_id, session: Session = Depends(get_session), usuario: User = Depends(verify_token)):

    pass



    

    

