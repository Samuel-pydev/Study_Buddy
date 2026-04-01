from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from supabase import create_client
from dotenv import load_dotenv

import os

load_dotenv()

supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_KEY")
)

class UserCredentials(BaseModel):
    email: str
    password: str
    
router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup")
def signup(credentials: UserCredentials):
    try:
        response = supabase.auth.sign_up({
            "email": credentials.email,
            "password": credentials.password
        })
        return {"message": "Account created successfully", "user": response.user.email}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    

@router.post("/signin")
def signin(credentials: UserCredentials):
    try:
        response = supabase.auth.sign_in_with_password({
            "email": credentials.email,
            "password": credentials.password
        })
        return{
            "access_token": response.session.access_token,
            "user_id": response.user.id
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    
@router.post("/signout")
def signout(authorization: str = Header(...)):
    try:
        token = authorization.replace("Bearer ", "")
        supabase.auth.sign_out()
        return {"message": "Farewell"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/me")
def get_me(authorization: str = Header(...)):
    try:
        token = authorization.replace("Bearer ", "")
        response = supabase.auth.get_user(token)
        return {
            "id": response.user.id,
            "email": response.user.email,
            "display_name": response.user.user_metadata.get("display_name", "")
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))