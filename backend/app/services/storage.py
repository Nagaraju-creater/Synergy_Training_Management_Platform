import os
import shutil
from fastapi import UploadFile
import httpx
from uuid import uuid4
from app.config import settings

class StorageService:
    @staticmethod
    async def _upload(file: UploadFile, folder: str, filename: str) -> str:
        """
        Internal helper to upload a file to Supabase or save locally.
        """
        if settings.SUPABASE_URL and settings.SUPABASE_SERVICE_KEY:
            # Read file bytes
            file_bytes = await file.read()
            await file.seek(0)
            
            base_url = settings.SUPABASE_URL.rstrip("/")
            bucket = settings.SUPABASE_BUCKET
            # Path in bucket is folder/filename
            path = f"{folder}/{filename}"
            url = f"{base_url}/storage/v1/object/{bucket}/{path}"
            
            headers = {
                "Authorization": f"Bearer {settings.SUPABASE_SERVICE_KEY}",
                "apikey": settings.SUPABASE_SERVICE_KEY,
                "Content-Type": file.content_type or "application/octet-stream",
                "x-upsert": "true"
            }
            
            async with httpx.AsyncClient() as client:
                res = await client.post(url, content=file_bytes, headers=headers)
                if res.status_code not in (200, 201):
                    # Try PUT as fallback (e.g. if object already exists and POST fails)
                    res_put = await client.put(url, content=file_bytes, headers=headers)
                    if res_put.status_code not in (200, 201):
                        raise Exception(f"Supabase Storage Upload Failed: {res_put.status_code} - {res_put.text}")
            
            return f"{base_url}/storage/v1/object/public/{bucket}/{path}"
            
        else:
            # Local Disk Fallback
            local_dir = os.path.join("uploads", folder)
            os.makedirs(local_dir, exist_ok=True)
            dest = os.path.join(local_dir, filename)
            with open(dest, "wb") as f:
                shutil.copyfileobj(file.file, f)
            return f"/uploads/{folder}/{filename}"

    @classmethod
    async def upload_avatar(cls, employee_id_str: str, file: UploadFile) -> str:
        ext = os.path.splitext(file.filename or ".jpg")[1]
        filename = f"{employee_id_str}{ext}"
        return await cls._upload(file, "avatars", filename)

    @classmethod
    async def upload_signature(cls, user_id_str: str, file: UploadFile) -> str:
        ext = os.path.splitext(file.filename or ".png")[1]
        filename = f"{user_id_str}_{uuid4()}{ext}"
        return await cls._upload(file, "signatures", filename)

    @classmethod
    async def upload_training_document(cls, training_id_str: str, file: UploadFile) -> str:
        # Save under trainings/{training_id_str}/{filename}
        folder = f"trainings/{training_id_str}"
        return await cls._upload(file, folder, file.filename or "document.pdf")

    @classmethod
    async def upload_learning_material(cls, module_id_str: str, file: UploadFile) -> str:
        # Save under learning_materials/{module_id_str}/{filename}
        folder = f"learning_materials/{module_id_str}"
        return await cls._upload(file, folder, file.filename or "document.pdf")

storage_service = StorageService()


