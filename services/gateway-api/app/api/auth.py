from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.api.dependencies import current_user
from app.core.cookies import clear_auth_cookie, set_auth_cookie
from app.core.security import encode_access_token
from app.models import ChangePasswordRequest, LoginRequest, LoginResponse, UserPublic
from app.services.repository import UserRecord, repository
from app.services.serializers import serialize_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, response: Response) -> LoginResponse:
    user = repository.authenticate(payload.username, payload.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    permissions = repository.user_permissions(user)
    token = encode_access_token(user.username, user.roles, permissions)
    set_auth_cookie(response, token)
    return LoginResponse(user=serialize_user(user))


@router.post("/logout")
def logout(response: Response) -> dict[str, bool]:
    clear_auth_cookie(response)
    return {"ok": True}


@router.get("/me", response_model=UserPublic)
def me(user: UserRecord = Depends(current_user)) -> UserPublic:
    return serialize_user(user)


@router.post("/change-password")
def change_password(
    payload: ChangePasswordRequest,
    user: UserRecord = Depends(current_user),
) -> dict[str, bool]:
    try:
        repository.change_password(user.id, payload.old_password, payload.new_password)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid old password",
        ) from None
    return {"ok": True}
