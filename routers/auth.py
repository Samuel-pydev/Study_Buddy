from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from clients import get_supabase_client


supabase = get_supabase_client()

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