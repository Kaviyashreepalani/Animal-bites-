import os, json, firebase_admin, dotenv
from firebase_admin import credentials, firestore
dotenv.load_dotenv()
key = os.environ.get("FIREBASE_SERVICE_ACCOUNT_KEY")
print("Key (first 100 chars):", key[:100] + "...")
try:
    config = json.loads(key)
    cred = credentials.Certificate(config)
    firebase_admin.initialize_app(cred)
    db = firestore.client()
    doc = db.collection("DOCTOR").document("1").get()
    print("DOCTOR/1 qn:", doc.to_dict().get("qn", []))
except Exception as e:
    print("Error:", e)