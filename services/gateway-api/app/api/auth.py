from fastapi import APIRouter, HTTPException, status

from app.core.security import create_access_token
from app.models import LoginRequest, LoginResponse, UserPublic
from app.services.repository import repository
from app.services.serializers import serialize_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest) -> LoginResponse:
    user = repository.authenticate(payload.username, payload.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    permissions = repository.user_permissions(user)
    return LoginResponse(
        access_token=create_access_token(user.username, user.roles, permissions),
        user=serialize_user(user),
    )


@router.get("/me", response_model=UserPublic)
def me() -> UserPublic:
    user = repository.get_user_by_username("admin")
    if user is None:
        raise HTTPException(status_code=404, detail="Bootstrap admin missing")
    return serialize_user(user)

