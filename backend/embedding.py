import os
from langchain_openai import OpenAIEmbeddings
from pymongo.mongo_client import MongoClient
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

# Get env variables
MONGO_URI = os.environ.get("MONGODB_URI")                                                                                
openai_api_key = os.environ.get("OPENAI_KEY") 

if not MONGO_URI or not openai_api_key:
    raise ValueError("MONGODB_URI and OPENAI_KEY must be set in environment variables.")

# Initialize embeddings model - Use same model as in app.py
embeddings_model = OpenAIEmbeddings(model="text-embedding-3-large", api_key=openai_api_key)

# Connect to MongoDB
client = MongoClient(MONGO_URI)
db = client["pdf_file"] 
collection = db["animal_bites"]

def store_question_answer(ques, ans):
    """
    Store a new question-answer pair into MongoDB with its embedding.
    This function handles both new doctor answers and manually added Q&As.
    """
    try:
        # Generate embedding for the question
        ques_embedding = embeddings_model.embed_query(ques)
        
        # Check if question already exists to avoid duplicates
        existing = collection.find_one({"question": ques})
        if existing:
            # Update existing document
            collection.update_one(
                {"question": ques},
                {
                    "$set": {
                        "answer": ans,
                        "embeddings": ques_embedding,  # Use 'embeddings' to match vector search
                        "embedding": ques_embedding,   # Keep both for compatibility
                        "status": "answered"
                    }
                }
            )
            print(f"✅ Updated existing Q&A in MongoDB!\nQuestion: {ques}\nAnswer: {ans}")
        else:
            # Create new document
            document = {
                "question": ques,
                "answer": ans,
                "embeddings": ques_embedding,  # Primary field for vector search
                "embedding": ques_embedding,   # Secondary field for compatibility
                "status": "answered",
                "source": "doctor_answer"
            }
            
            result = collection.insert_one(document)
            print(f"✅ New Q&A inserted successfully into MongoDB!\nQuestion: {ques}\nAnswer: {ans}\nDocument ID: {result.inserted_id}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error storing Q&A in MongoDB: {e}")
        return False

def test_mongodb_connection():
    """Test MongoDB connection and vector search functionality"""
    try:
        # Test connection
        collections = db.list_collection_names()
        print(f"✅ MongoDB connected. Collections: {collections}")
        
        # Test vector search setup
        indexes = list(collection.list_indexes())
        print(f"✅ Available indexes: {[idx['name'] for idx in indexes]}")
        
        # Count documents
        count = collection.count_documents({})
        print(f"✅ Total documents in collection: {count}")
        
        # Test a simple query
        sample_docs = list(collection.find().limit(2))
        print(f"✅ Sample documents structure: {[list(doc.keys()) for doc in sample_docs]}")
        
        return True
        
    except Exception as e:
        print(f"❌ MongoDB connection test failed: {e}")
        return False

def create_vector_index():
    """
    Create vector search index for MongoDB Atlas.
    This is only needed once and should be run manually if the index doesn't exist.
    """
    try:
        # This would typically be done through MongoDB Atlas UI or CLI
        # Keeping this as documentation of the required index structure
        index_definition = {
            "fields": [
                {
                    "type": "vector",
                    "path": "embeddings",
                    "numDimensions": 3072,  # text-embedding-3-large dimensions
                    "similarity": "cosine"
                }
            ]
        }
        print("Vector index definition (create this in MongoDB Atlas):")
        print(index_definition)
        
    except Exception as e:
        print(f"Error creating vector index: {e}")

if __name__ == "__main__":
    # Test the connection when running directly
    print("Testing MongoDB connection...")
    test_mongodb_connection()
    
    # Test storing a sample Q&A
    test_question = "What should I do if a dog bites me?"
    test_answer = "Clean the wound immediately with soap and water, apply antiseptic, and seek medical attention if the bite is deep or if you're unsure about the dog's vaccination status."
    
    print("\nTesting Q&A storage...")
    store_question_answer(test_question, test_answer)