from fastapi import APIRouter, Depends, HTTPException, Response, Request
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import JSONResponse
from app.dependencies import get_session, verify_token
from app.schemas import UserRegister, UserResponse, UserLogin
from app.models import User
from jose import jwt, JWTError
from app.auth import authenticate_user, create_token, bcrypt_context
from sqlalchemy.orm import Session
from datetime import timedelta
from app.utils import limiter
import os

auth_route = APIRouter(prefix="/auth", tags=["auth"])

SECRET_KEY = os.getenv('SECRET_KEY')
ALGORITHM = os.getenv('ALGORITHM')

@limiter.limit("5/minute")
@auth_route.post('/register', response_model=UserResponse)
async def register(request: Request, usuario: UserRegister, session: Session = Depends(get_session)):
    admin = False
    has_user = session.query(User).filter(User.email==usuario.email).first()

    if has_user:
        raise HTTPException(status_code=400, detail="User already registered.")
    
    senha_criptografada = bcrypt_context.hash(usuario.password)
    if usuario.email == 'admin@example.com':
        admin = True
    novo_usuario = User(name=usuario.name, email=usuario.email, password=senha_criptografada, admin=admin)
    session.add(novo_usuario)
    session.commit()
    return novo_usuario


@auth_route.post("/login")
@limiter.limit("5/minute")
async def login(request: Request, response: Response, usuario: UserLogin, session: Session = Depends(get_session)):

    print(request.client.host)

    usuario = authenticate_user(usuario.email, usuario.password, session)

    if not usuario:
        raise HTTPException(status_code=401, detail='User not found')
    
    bearer_token = create_token(usuario.id)
    refresh_token = create_token(usuario.id, timedelta(days=7))

    response = JSONResponse(
        content={
            "message": "Login successful"
        }
    )
    response.set_cookie(
        key="access_token",
        value=bearer_token,
        httponly=True,
        secure=False,      # for localhost only
        samesite="Lax",  
        path="/"
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=False,      # for localhost only
        samesite="Lax",  
        path="/"
    )

    return response

@auth_route.post("/login-form")
async def login_form(response: Response, user: OAuth2PasswordRequestForm = Depends(), session: Session = Depends(get_session)):

    usuario = authenticate_user(user.username, user.password, session)

    if not usuario:
        raise HTTPException(status_code=401, detail='User not found')
    
    bearer_token = create_token(usuario.id)
    refresh_token = create_token(usuario.id, timedelta(days=7))

    response.set_cookie(
        key="access_token",
        value=bearer_token,
        httponly=True
    )

    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True
    )
    
    return {"access_token": bearer_token, "refresh_token": refresh_token, "token_type": 'Bearer '}

@limiter.limit("5/minute")
@auth_route.post(path="/refresh")
async def use_refresh_token(response: Response, request: Request, session = Depends(get_session)):

    # Get cookies
    refresh_token = request.cookies.get('refresh_token')

    if not refresh_token:

        raise HTTPException(401, "refresh token missing.")
    
    try:

        payload = jwt.decode(token=refresh_token, key=SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload.get('sub'))

    except JWTError:

        raise HTTPException(401, "invalid refresh token")
    
    usuario = session.query(User).filter(User.id == user_id).first()

    access_token = create_token(user_id, timedelta(minutes=30))

    response.set_cookie(
        key='access_token',
        value=access_token,
        httponly=True
    )

    return {
        "access_token": access_token,
        "authenticated": True
    }



@auth_route.post("/protected")
async def protected(request: Request, usuario = Depends(verify_token)):
    token = request.cookies.get("access_token")

    if not token:
        return {"error": "not authenticated", "authenticated": False}

    return {"message": "you are authenticated", "authenticated": True}


@auth_route.post("/logout")
async def logout_user(response: Response):

    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")

    return {"message": "Logged out successfully"}