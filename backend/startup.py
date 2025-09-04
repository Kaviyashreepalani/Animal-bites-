#!/usr/bin/env python3
"""
Startup script to test connections and start the Flask application
"""

import os
import sys
import dotenv
import traceback
from datetime import datetime

def print_status(message, status="INFO"):
    timestamp = datetime.now().strftime("%H:%M:%S")
    if status == "SUCCESS":
        print(f"✅ [{timestamp}] {message}")
    elif status == "ERROR":
        print(f"❌ [{timestamp}] {message}")
    elif status == "WARNING":
        print(f"⚠️ [{timestamp}] {message}")
    else:
        print(f"ℹ️ [{timestamp}] {message}")

def check_environment():
    """Check if all required environment variables are set"""
    print_status("Checking environment variables...")
    
    dotenv.load_dotenv()
    
    required_vars = {
        "MONGODB_URI": "MongoDB connection string",
        "OPENAI_KEY": "OpenAI API key",
        "FIREBASE_SERVICE_ACCOUNT_KEY": "Firebase service account JSON"
    }
    
    optional_vars = {
        "GOOGLE_APPLICATION_CREDENTIALS": "Google Cloud credentials file path"
    }
    
    missing_required = []
    
    for var, description in required_vars.items():
        if os.getenv(var):
            print_status(f"{var}: Found", "SUCCESS")
        else:
            print_status(f"{var}: Missing ({description})", "ERROR")
            missing_required.append(var)
    
    for var, description in optional_vars.items():
        if os.getenv(var):
            print_status(f"{var}: Found", "SUCCESS")
        else:
            print_status(f"{var}: Missing ({description}) - TTS/STT will not work", "WARNING")
    
    return len(missing_required) == 0

def test_mongodb():
    """Test MongoDB connection"""
    print_status("Testing MongoDB connection...")
    
    try:
        from pymongo.mongo_client import MongoClient
        
        client = MongoClient(os.environ.get("MONGODB_URI"))
        db = client["pdf_file"]
        collection = db["animal_bites"]
        
        # Test connection
        collections = db.list_collection_names()
        print_status(f"MongoDB connected. Collections: {len(collections)}", "SUCCESS")
        
        # Test collection access
        count = collection.count_documents({})
        print_status(f"animal_bites collection has {count} documents", "SUCCESS")
        
        return True
    except Exception as e:
        print_status(f"MongoDB connection failed: {e}", "ERROR")
        return False
def test_firebase():
    """Test Firebase connection."""
    print_status("Testing Firebase connection...")
    try:
        from forward import initialize_firebase
        db = initialize_firebase()
        test_doc_ref = db.collection("test").document("connection_test")
        test_doc_ref.set({"timestamp": datetime.now().isoformat(), "test": "ok"})
        test_doc = test_doc_ref.get()
        if test_doc.exists:
            print_status(f"Firebase test document created and read successfully: {test_doc.to_dict()}", "SUCCESS")
            test_doc_ref.delete()
            return True
        else:
            print_status("Firebase test document not found after write.", "ERROR")
            return False
    except Exception as e:
        print_status(f"Firebase connection failed: {e}", "ERROR")
        import traceback
        traceback.print_exc()
        return False
def test_openai():
    """Test OpenAI connection"""
    print_status("Testing OpenAI connection...")
    
    try:
        from langchain_openai import OpenAIEmbeddings, ChatOpenAI
        from pydantic import SecretStr
        
        # Test embeddings
        embeddings = OpenAIEmbeddings(
            model="text-embedding-3-large", 
            api_key=SecretStr(os.environ.get("OPENAI_KEY"))
        )
        
        test_embedding = embeddings.embed_query("test")
        if len(test_embedding) > 0:
            print_status("OpenAI embeddings working", "SUCCESS")
        
        # Test chat
        llm = ChatOpenAI(
            model="gpt-3.5-turbo", 
            temperature=0, 
            api_key=SecretStr(os.environ.get("OPENAI_KEY"))
        )
        
        response = llm.invoke("Say 'test successful'")
        if "test successful" in response.content.lower():
            print_status("OpenAI chat working", "SUCCESS")
        
        return True
    except Exception as e:
        print_status(f"OpenAI connection failed: {e}", "ERROR")
        return False

def create_sample_data():
    """Create sample data if collections are empty"""
    print_status("Checking for sample data...")
    
    try:
        from forward import get_unanswered_questions, add_question_answer
        
        # Check if we have any data
        questions = get_unanswered_questions()
        
        if len(questions) == 0:
            print_status("No unanswered questions found, creating sample data...")
            
            sample_questions = [
                {
                    "question": "What should I do immediately after a dog bite?",
                    "answer": "Clean the wound immediately with soap and warm water for at least 5 minutes. Apply antiseptic and cover with a sterile bandage. Seek medical attention, especially if the wound is deep, bleeding heavily, or if you're unsure about the dog's vaccination status."
                },
                {
                    "question": "How can I tell if an animal bite is infected?",
                    "answer": "Signs of infection include increased redness and swelling around the wound, warmth, pus or discharge, red streaking from the wound, fever, and increased pain. If you notice any of these symptoms, seek medical attention immediately."
                },
                {
                    "question": "Do I need a tetanus shot after an animal bite?",
                    "answer": "If your tetanus vaccination is not up to date (last shot more than 5-10 years ago), you should get a tetanus booster. For deep or dirty wounds, a booster may be needed if it's been more than 5 years since your last shot."
                }
            ]
            
            for sample in sample_questions:
                add_question_answer(sample["question"], sample["answer"])
                print_status(f"Added sample Q&A: {sample['question'][:50]}...", "SUCCESS")
                
        else:
            print_status(f"Found {len(questions)} existing questions", "SUCCESS")
            
    except Exception as e:
        print_status(f"Failed to create sample data: {e}", "ERROR")

def main():
    print("🚀 Animal Bite Dashboard Startup Script")
    print("=" * 50)
    
    # Check environment
    if not check_environment():
        print_status("Environment check failed. Please set required environment variables.", "ERROR")
        sys.exit(1)
    
    print("\n🔍 Testing Connections...")
    print("-" * 30)
    
    # Test connections
    mongodb_ok = test_mongodb()
    firebase_ok = test_firebase()
    openai_ok = test_openai()
    
    if not all([mongodb_ok, firebase_ok, openai_ok]):
        print_status("Some connections failed. Check the errors above.", "ERROR")
        
        # Ask if user wants to continue anyway
        response = input("\nDo you want to start the server anyway? (y/N): ")
        if response.lower() != 'y':
            sys.exit(1)
    
    # Create sample data if needed
    if firebase_ok:
        create_sample_data()
    
    print("\n🌟 All checks passed! Starting Flask application...")
    print("-" * 50)
    
    # Import and start the app
    try:
        from app import app, initialize_app
        
        # Initialize the application
        initialize_app()
        
        print(f"🌐 Server starting on http://localhost:5000")
        print(f"📊 Dashboard endpoints:")
        print(f"   - http://localhost:5000/api/health")
        print(f"   - http://localhost:5000/api/dashboard/stats")
        print(f"   - http://localhost:5000/api/dashboard/unanswered-questions")
        print(f"   - http://localhost:5000/api/dashboard/solved-questions")
        print("\n🔧 React frontend should be running on http://localhost:3001")
        print("💡 Make sure to start your React app with: npm start")
        
        # Start the Flask app
        app.run(debug=True, host="0.0.0.0", port=5000)
        
    except KeyboardInterrupt:
        print_status("Server stopped by user", "INFO")
    except Exception as e:
        print_status(f"Failed to start server: {e}", "ERROR")
        traceback.print_exc()

if __name__ == "__main__":
    main()