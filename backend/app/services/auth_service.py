import os
from datetime import datetime, timedelta
from passlib.context import CryptContext
from jose import jwt, JWTError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException
from slugify import slugify
from uuid import uuid4

from app.models import User, Tenant
from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class AuthService:
    @staticmethod
    def get_password_hash(password: str) -> str:
        return pwd_context.hash(password)

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        return pwd_context.verify(plain_password, hashed_password)

    @staticmethod
    def create_access_token(data: dict) -> str:
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
        return encoded_jwt

    @staticmethod
    def decode_token(token: str) -> dict:
        try:
            payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
            return payload
        except JWTError:
            raise HTTPException(status_code=401, detail="Invalid or expired token")

    @classmethod
    async def register(cls, db: AsyncSession, company_name: str, full_name: str, email: str, password: str):
        existing_user = await db.execute(select(User).where(User.email == email))
        if existing_user.scalars().first():
            raise HTTPException(status_code=409, detail="Email already registered")

        base_slug = slugify(company_name)
        slug = f"{base_slug}-{str(uuid4())[:6]}"
        
        new_tenant = Tenant(
            name=company_name,
            slug=slug,
            plan="free",
        )
        db.add(new_tenant)
        await db.flush()

        new_user = User(
            tenant_id=new_tenant.id,
            full_name=full_name,
            email=email,
            hashed_password=cls.get_password_hash(password),
            role="admin",
            is_active=True
        )
        db.add(new_user)
        await db.flush()

        access_token = cls.create_access_token(data={
            "sub": new_user.id,
            "tenant_id": new_tenant.id,
            "role": new_user.role,
            "email": new_user.email
        })

        return new_user, new_tenant, access_token
    
    @classmethod
    async def login(cls, db: AsyncSession, email: str, password: str):
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalars().first()

        if not user or not cls.verify_password(password, user.hashed_password):
            raise HTTPException(status_code=401, detail="Invalid email or password")
        if not user.is_active:
            raise HTTPException(status_code=403, detail="User account is deactivated")
        
        result_tenant = await db.execute(select(Tenant).where(Tenant.id == user.tenant_id))
        tenant = result_tenant.scalars().first()

        access_token = cls.create_access_token(data={
            "sub": user.id,
            "tenant_id": user.tenant_id,
            "role": user.role,
            "email": user.email
        })
        return user, tenant, access_token

    @classmethod
    async def get_user_by_token(cls, db: AsyncSession, token: str):
        payload = cls.decode_token(token)
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token payload")
        
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalars().first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        result_tenant = await db.execute(select(Tenant).where(Tenant.id == user.tenant_id))
        tenant = result_tenant.scalars().first()

        return user, tenant
