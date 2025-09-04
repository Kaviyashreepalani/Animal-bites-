#!/usr/bin/env python3
"""
Script to clean up casual conversations from Firebase database.
Run this script to remove unnecessary conversations like greetings, thank you messages, etc.
"""

import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime
import os
import json
from dotenv import load_dotenv

load_dotenv()

def get_firebase_config():
    firebase_key = os.environ.get("FIREBASE_SERVICE_ACCOUNT_KEY")
    if firebase_key:
        if firebase_key.strip().startswith('{'):
            return json.loads(firebase_key)
        raise ValueError("FIREBASE_SERVICE_ACCOUNT_KEY must be a JSON string in .env")
    raise ValueError("FIREBASE_SERVICE_ACCOUNT_KEY not found in environment variables.")

def initialize_firebase():
    if firebase_admin._apps:
        return firestore.client()
    firebase_config = get_firebase_config()
    cred = credentials.Certificate(firebase_config)
    firebase_admin.initialize_app(cred)
    return firestore.client()

def is_casual_conversation(question, answer):
    """Check if a conversation is casual/unnecessary"""
    
    # Casual greeting patterns
    casual_patterns = [
        "hi", "hello", "hey", "good morning", "good afternoon", "good evening",
        "how are you", "thank you", "thanks", "bye", "goodbye", "ok", "okay",
        "yes", "no", "sure", "great", "awesome", "cool", "nice", "fine",
        "what's up", "how's it going", "see you", "take care", "good night",
        "good day", "how do you do", "pleased to meet you", "nice to meet you"
    ]
    
    # Check question
    question_lower = question.lower().strip()
    if any(pattern in question_lower for pattern in casual_patterns):
        return True
    
    # Check if question is too short (likely casual)
    if len(question.strip()) < 10:
        return True
    
    # Check if answer is a generic greeting response
    answer_lower = answer.lower().strip()
    greeting_responses = [
        "hello", "hi there", "good morning", "good afternoon", "good evening",
        "how can i help", "nice to meet you", "pleased to meet you",
        "thank you for", "you're welcome", "no problem"
    ]
    
    if any(response in answer_lower for response in greeting_responses):
        return True
    
    # Check if answer is too short (likely not medical advice)
    if len(answer.strip()) < 20:
        return True
    
    return False

def cleanup_casual_conversations(dry_run=True):
    """Clean up casual conversations from Firebase"""
    
    db = initialize_firebase()
    
    print("🔍 Scanning user conversations for casual interactions...")
    
    # Get all user interactions
    user_collection = db.collection("user")
    docs = user_collection.stream()
    
    casual_conversations = []
    total_conversations = 0
    
    for doc in docs:
        total_conversations += 1
        data = doc.to_dict()
        
        question = data.get("question", "")
        answer = data.get("answer", "")
        timestamp = data.get("timestamp")
        session_id = data.get("session_id", "")
        
        if is_casual_conversation(question, answer):
            casual_conversations.append({
                'doc_id': doc.id,
                'question': question,
                'answer': answer,
                'timestamp': timestamp,
                'session_id': session_id
            })
    
    print(f"\n📊 Analysis Results:")
    print(f"   Total conversations: {total_conversations}")
    print(f"   Casual conversations found: {len(casual_conversations)}")
    print(f"   Medical conversations: {total_conversations - len(casual_conversations)}")
    
    if casual_conversations:
        print(f"\n🔍 Sample casual conversations to be removed:")
        for i, conv in enumerate(casual_conversations[:5]):  # Show first 5 examples
            print(f"   {i+1}. Q: '{conv['question'][:50]}...' A: '{conv['answer'][:50]}...'")
        
        if len(casual_conversations) > 5:
            print(f"   ... and {len(casual_conversations) - 5} more")
    
    if dry_run:
        print(f"\n🔸 DRY RUN MODE - No data will be deleted")
        print(f"🔸 To actually delete casual conversations, run with dry_run=False")
        return len(casual_conversations)
    
    # Actually delete casual conversations
    if casual_conversations:
        print(f"\n🗑️  Deleting {len(casual_conversations)} casual conversations...")
        
        deleted_count = 0
        for conv in casual_conversations:
            try:
                user_collection.document(conv['doc_id']).delete()
                deleted_count += 1
                if deleted_count % 10 == 0:
                    print(f"   Deleted {deleted_count}/{len(casual_conversations)} conversations...")
            except Exception as e:
                print(f"   Error deleting conversation {conv['doc_id']}: {e}")
        
        print(f"✅ Successfully deleted {deleted_count} casual conversations")
        print(f"📊 Remaining conversations: {total_conversations - deleted_count}")
    else:
        print("✅ No casual conversations found to delete")
    
    return deleted_count if not dry_run else len(casual_conversations)

def main():
    print("🧹 Casual Conversation Cleanup Tool")
    print("=" * 50)
    
    try:
        # First run in dry-run mode to see what would be deleted
        casual_count = cleanup_casual_conversations(dry_run=True)
        
        if casual_count > 0:
            print(f"\n" + "=" * 50)
            response = input(f"Do you want to delete {casual_count} casual conversations? (y/N): ")
            
            if response.lower() == 'y':
                print("\n🗑️  Proceeding with deletion...")
                deleted = cleanup_casual_conversations(dry_run=False)
                print(f"\n✅ Cleanup completed! Deleted {deleted} casual conversations.")
            else:
                print("\n🚫 Cleanup cancelled.")
        else:
            print("\n✅ No cleanup needed - no casual conversations found!")
            
    except Exception as e:
        print(f"\n❌ Error during cleanup: {e}")

if __name__ == "__main__":
    main()