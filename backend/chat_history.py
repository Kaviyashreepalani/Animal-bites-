from datetime import datetime
from typing import List, Dict, Any, Optional
import logging
from google.cloud.firestore_v1 import Increment

logger = logging.getLogger(__name__)

def create_chat_session(db, user_id: str, language: str = "en") -> str:
    """Create a new chat session for a user"""
    try:
        session_data = {
            "user_id": user_id,
            "language": language,
            "created_at": datetime.now(),
            "last_activity": datetime.now(),
            "is_active": True,
            "message_count": 0,
            "preview": "New conversation"
        }
        
        doc_ref = db.collection("chat_sessions").add(session_data)
        session_id = doc_ref[1].id
        
        logger.info(f"✅ Chat session created: {session_id} for user: {user_id}")
        return session_id
    except Exception as e:
        logger.error(f"❌ Failed to create chat session: {e}")
        import traceback
        traceback.print_exc()
        raise

def get_user_sessions(db, user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
    """Get all chat sessions for a user"""
    try:
        logger.info(f"🔍 Fetching sessions for user: {user_id}")
        
        sessions_query = db.collection("chat_sessions").where(
            "user_id", "==", user_id
        ).where(
            "is_active", "==", True
        ).order_by(
            "last_activity", direction="DESCENDING"
        ).limit(limit)
        
        sessions = sessions_query.stream()
        
        result = []
        for doc in sessions:
            session_data = doc.to_dict()
            session_data["session_id"] = doc.id
            
            # Convert datetime to string for JSON serialization
            if session_data.get("created_at"):
                session_data["created_at"] = session_data["created_at"].isoformat()
            if session_data.get("last_activity"):
                session_data["last_activity"] = session_data["last_activity"].isoformat()
            
            # Get preview from stored preview or first message
            if "preview" not in session_data or session_data["preview"] == "New conversation":
                messages = get_session_messages(db, doc.id, limit=1)
                if messages:
                    preview_text = messages[0]["user_message"]
                    session_data["preview"] = preview_text[:50] + "..." if len(preview_text) > 50 else preview_text
                else:
                    session_data["preview"] = "New conversation"
            
            result.append(session_data)
            logger.info(f"  📝 Session {doc.id}: {session_data['preview']}")
        
        logger.info(f"✅ Found {len(result)} sessions")
        return result
    except Exception as e:
        logger.error(f"❌ Failed to get user sessions: {e}")
        import traceback
        traceback.print_exc()
        return []

def get_active_session(db, user_id: str) -> Optional[str]:
    """Get the most recent active session for a user"""
    try:
        logger.info(f"🔍 Getting active session for user: {user_id}")
        
        sessions = db.collection("chat_sessions").where(
            "user_id", "==", user_id
        ).where(
            "is_active", "==", True
        ).order_by(
            "last_activity", direction="DESCENDING"
        ).limit(1).stream()
        
        for doc in sessions:
            logger.info(f"✅ Found active session: {doc.id}")
            return doc.id
        
        # Create new session if none exists
        logger.info("📝 No active session found, creating new one")
        return create_chat_session(db, user_id)
    except Exception as e:
        logger.error(f"❌ Failed to get active session: {e}")
        import traceback
        traceback.print_exc()
        # Try to create new session as fallback
        try:
            return create_chat_session(db, user_id)
        except:
            return None

def save_message(db, session_id: str, user_message: str, bot_response: str, 
                language: str = "en") -> bool:
    """Save a message exchange to a chat session"""
    try:
        logger.info(f"💾 Saving message to session: {session_id}")
        logger.info(f"   User: {user_message[:50]}...")
        logger.info(f"   Bot: {bot_response[:50]}...")
        
        message_data = {
            "session_id": session_id,
            "user_message": user_message,
            "bot_response": bot_response,
            "language": language,
            "timestamp": datetime.now()
        }
        
        # Add message
        msg_ref = db.collection("chat_messages").add(message_data)
        logger.info(f"✅ Message saved with ID: {msg_ref[1].id}")
        
        # Update session activity and preview
        session_ref = db.collection("chat_sessions").document(session_id)
        
        # Check if session exists
        session_doc = session_ref.get()
        if not session_doc.exists:
            logger.error(f"❌ Session {session_id} does not exist!")
            return False
        
        preview_text = user_message[:50] + "..." if len(user_message) > 50 else user_message
        
        session_ref.update({
            "last_activity": datetime.now(),
            "message_count": Increment(1),
            "preview": preview_text
        })
        
        logger.info(f"✅ Session updated: {session_id}")
        return True
    except Exception as e:
        logger.error(f"❌ Failed to save message: {e}")
        import traceback
        traceback.print_exc()
        return False

def get_session_messages(db, session_id: str, limit: int = 50) -> List[Dict[str, Any]]:
    """Get all messages from a chat session"""
    try:
        logger.info(f"📖 Fetching messages for session: {session_id}")
        
        messages = db.collection("chat_messages").where(
            "session_id", "==", session_id
        ).order_by(
            "timestamp", direction="ASCENDING"
        ).limit(limit).stream()
        
        result = []
        for doc in messages:
            message_data = doc.to_dict()
            message_data["message_id"] = doc.id
            
            # Convert timestamp to string
            if message_data.get("timestamp"):
                message_data["timestamp"] = message_data["timestamp"].isoformat()
            
            result.append(message_data)
        
        logger.info(f"✅ Found {len(result)} messages")
        return result
    except Exception as e:
        logger.error(f"❌ Failed to get session messages: {e}")
        import traceback
        traceback.print_exc()
        return []

def delete_session(db, session_id: str, user_id: str) -> bool:
    """Delete a chat session (soft delete)"""
    try:
        logger.info(f"🗑️  Deleting session: {session_id}")
        
        # Verify session belongs to user
        session_doc = db.collection("chat_sessions").document(session_id).get()
        if not session_doc.exists:
            logger.warning(f"❌ Session not found: {session_id}")
            return False
        
        session_data = session_doc.to_dict()
        if session_data.get("user_id") != user_id:
            logger.warning(f"❌ Unauthorized session delete attempt: {session_id}")
            return False
        
        # Soft delete
        session_doc.reference.update({"is_active": False})
        
        logger.info(f"✅ Session deleted: {session_id}")
        return True
    except Exception as e:
        logger.error(f"❌ Failed to delete session: {e}")
        import traceback
        traceback.print_exc()
        return False

def clear_all_sessions(db, user_id: str) -> bool:
    """Clear all sessions for a user"""
    try:
        logger.info(f"🗑️  Clearing all sessions for user: {user_id}")
        
        sessions = db.collection("chat_sessions").where(
            "user_id", "==", user_id
        ).where(
            "is_active", "==", True
        ).stream()
        
        count = 0
        for doc in sessions:
            doc.reference.update({"is_active": False})
            count += 1
        
        logger.info(f"✅ Cleared {count} sessions for user: {user_id}")
        return True
    except Exception as e:
        logger.error(f"❌ Failed to clear sessions: {e}")
        import traceback
        traceback.print_exc()
        return False

def get_session_info(db, session_id: str) -> Optional[Dict[str, Any]]:
    """Get information about a specific session"""
    try:
        logger.info(f"ℹ️  Getting info for session: {session_id}")
        
        session_doc = db.collection("chat_sessions").document(session_id).get()
        if not session_doc.exists:
            logger.warning(f"❌ Session not found: {session_id}")
            return None
        
        session_data = session_doc.to_dict()
        session_data["session_id"] = session_doc.id
        
        # Convert datetime to string
        if session_data.get("created_at"):
            session_data["created_at"] = session_data["created_at"].isoformat()
        if session_data.get("last_activity"):
            session_data["last_activity"] = session_data["last_activity"].isoformat()
        
        logger.info(f"✅ Session info retrieved: {session_id}")
        return session_data
    except Exception as e:
        logger.error(f"❌ Failed to get session info: {e}")
        import traceback
        traceback.print_exc()
        return None