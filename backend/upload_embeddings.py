from pymongo import MongoClient
from openai import OpenAI
import os

# ---------- CONFIGURATION ----------
# Your MongoDB connection string
MONGO_URI = "mongodb://localhost:27017"  # Change if using cloud MongoDB (Atlas)
DB_NAME = "pdf_embeddings"
COLLECTION_NAME = "documents"

# Your OpenAI API Key
os.environ["OPENAI_API_KEY"] = "your_openai_api_key"

# File path to your extracted TXT
TXT_FILE_PATH = r"C:\Users\Kaviya shree P\Documents\text\New Text Document.txt"

# ---------- CONNECT TO MONGODB ----------
client = MongoClient(MONGO_URI)
db = client[DB_NAME]
collection = db[COLLECTION_NAME]

# ---------- READ FILE ----------
with open(TXT_FILE_PATH, "r", encoding="utf-8") as f:
    text_content = f.read()

# ---------- CREATE EMBEDDINGS ----------
openai_client = OpenAI()
embedding_response = openai_client.embeddings.create(
    model="text-embedding-3-small",  # cheaper, for search
    input=text_content
)

embedding_vector = embedding_response.data[0].embedding

# ---------- STORE IN MONGODB ----------
doc = {
    "file_name": TXT_FILE_PATH.split("\\")[-1],
    "content": text_content,
    "embedding": embedding_vector
}

collection.insert_one(doc)

print(f"✅ Embeddings for '{TXT_FILE_PATH}' stored in MongoDB collection '{COLLECTION_NAME}'.")
