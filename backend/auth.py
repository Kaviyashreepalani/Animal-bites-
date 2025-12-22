import bcrypt
from datetime import datetime
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)

def initialize_firebase_auth(db):
    """Initialize users collection if it doesn't exist"""
    try:
        # Create users collection with initial admin if needed
        users_ref = db.collection("users")
        logger.info("Users collection initialized")
        return users_ref
    except Exception as e:
        logger.error(f"Failed to initialize auth: {e}")
        raise

def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    """Verify a password against its hash"""
    try:
        return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
    except Exception as e:
        logger.error(f"Password verification error: {e}")
        return False

def create_user(db, email: str, password: str, name: str) -> Dict[str, Any]:
    """Create a new user account"""
    try:
        users_ref = db.collection("users")
        
        # Check if user already exists
        existing = users_ref.where("email", "==", email).limit(1).stream()
        if list(existing):
            raise ValueError("User with this email already exists")
        
        # Create user document
        user_data = {
            "email": email,
            "password_hash": hash_password(password),
            "name": name,
            "created_at": datetime.now(),
            "last_login": None,
            "is_active": True
        }
        
        doc_ref = users_ref.add(user_data)
        user_id = doc_ref[1].id
        
        logger.info(f"User created successfully: {email}")
        return {
            "user_id": user_id,
            "email": email,
            "name": name
        }
    except ValueError as e:
        raise e
    except Exception as e:
        logger.error(f"Failed to create user: {e}")
        raise Exception("Failed to create user account")

def authenticate_user(db, email: str, password: str) -> Optional[Dict[str, Any]]:
    """Authenticate user and return user data if successful"""
    try:
        users_ref = db.collection("users")
        
        # Find user by email
        users = users_ref.where("email", "==", email).limit(1).stream()
        user_doc = None
        for doc in users:
            user_doc = doc
            break
        
        if not user_doc:
            logger.warning(f"Login attempt with non-existent email: {email}")
            return None
        
        user_data = user_doc.to_dict()
        
        # Check if account is active
        if not user_data.get("is_active", True):
            logger.warning(f"Login attempt for inactive account: {email}")
            return None
        
        # Verify password
        if not verify_password(password, user_data["password_hash"]):
            logger.warning(f"Failed login attempt for: {email}")
            return None
        
        # Update last login
        user_doc.reference.update({"last_login": datetime.now()})
        
        logger.info(f"User logged in successfully: {email}")
        return {
            "user_id": user_doc.id,
            "email": user_data["email"],
            "name": user_data["name"],
            "created_at": user_data["created_at"]
        }
    except Exception as e:
        logger.error(f"Authentication error: {e}")
        return None

def get_user_by_id(db, user_id: str) -> Optional[Dict[str, Any]]:
    """Get user data by user ID"""
    try:
        user_doc = db.collection("users").document(user_id).get()
        if not user_doc.exists:
            return None
        
        user_data = user_doc.to_dict()
        return {
            "user_id": user_doc.id,
            "email": user_data["email"],
            "name": user_data["name"],
            "created_at": user_data["created_at"]
        }
    except Exception as e:
        logger.error(f"Failed to get user: {e}")
        return None

def update_user_profile(db, user_id: str, name: Optional[str] = None) -> bool:
    """Update user profile information"""
    try:
        update_data = {}
        if name:
            update_data["name"] = name
        
        if update_data:
            db.collection("users").document(user_id).update(update_data)
            logger.info(f"User profile updated: {user_id}")
            return True
        return False
    except Exception as e:
        logger.error(f"Failed to update user profile: {e}")
        return False

def change_password(db, user_id: str, old_password: str, new_password: str) -> bool:
    """Change user password"""
    try:
        user_doc = db.collection("users").document(user_id).get()
        if not user_doc.exists:
            return False
        
        user_data = user_doc.to_dict()
        
        # Verify old password
        if not verify_password(old_password, user_data["password_hash"]):
            logger.warning(f"Failed password change attempt for user: {user_id}")
            return False
        
        # Update password
        new_hash = hash_password(new_password)
        user_doc.reference.update({"password_hash": new_hash})
        
        logger.info(f"Password changed successfully for user: {user_id}")
        return True
    except Exception as e:
        logger.error(f"Failed to change password: {e}")
        return False