import os
import json
import hashlib
import traceback
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv

# Load env
load_dotenv()

# Import reused code 
from translation import get_translator_client, get_texttospeech_client, translate_text
from forward import save_unanswered_question, save_user_interaction, db
from embedding import embeddings_model

# Langchain/OpenAI imports
from langchain_openai import ChatOpenAI

# LLM initialization 
OPENAI_KEY = os.environ.get("OPENAI_KEY", "")
if not OPENAI_KEY:
    raise RuntimeError("Set OPENAI_KEY in .env")

llm = ChatOpenAI(model="gpt-3.5-turbo-0125", temperature=0, api_key=OPENAI_KEY)
smaller_llm = ChatOpenAI(temperature=0, model="gpt-4o-mini", api_key=OPENAI_KEY)
larger_llm = ChatOpenAI(temperature=0, model="gpt-4o", api_key=OPENAI_KEY)

# Google clients
translator_client = get_translator_client()
texttospeech_client = get_texttospeech_client()

app = Flask(__name__)
CORS(app, supports_credentials=True)

DEFAULT_LANGUAGE = "en"

def cosine_similarity_manual(vec1, vec2):
    import numpy as np
    vec1 = np.array(vec1)
    vec2 = np.array(vec2)
    dot_product = np.dot(vec1, vec2)
    norm_vec1 = np.linalg.norm(vec1)
    norm_vec2 = np.linalg.norm(vec2)
    if norm_vec1 == 0 or norm_vec2 == 0:
        return 0.0
    return float(dot_product / (norm_vec1 * norm_vec2))

@app.route("/api/chat", methods=["POST"])
def api_chat():
    payload = request.json or {}
    user_message = payload.get("message", "").strip()
    language = payload.get("language", DEFAULT_LANGUAGE)

    if not user_message:
        return jsonify({"error": "No message provided"}), 400

    # 1) Translate to English
    try:
        user_input_english = translate_text(translator_client, user_message, DEFAULT_LANGUAGE, language) or user_message
    except Exception as e:
        print("Translation error:", e)
        traceback.print_exc()
        user_input_english = user_message

    modified_user_input = user_input_english
    bot_response_english = None

    try:
        # --- Try MongoDB search ---
        context = ""
        try:
            from pymongo import MongoClient
            mongo_uri = os.environ.get("MONGODB_URI")
            if mongo_uri:
                client = MongoClient(mongo_uri)
                db_mongo = client["pdf_file"]
                collection = db_mongo["animal_bites"]

                embedding = embeddings_model.embed_query(modified_user_input)

                # Vector search
                result = collection.aggregate([
                    {
                        "$vectorSearch": {
                            "index": "vector_index",
                            "path": "embedding",  # Try primary name
                            "queryVector": embedding,
                            "numCandidates": 100,
                            "limit": 3
                        }
                    }
                ])

                for doc in result:
                    # Handle both 'embedding' and 'embeddings'
                    db_embedding = doc.get("embedding") or doc.get("embeddings")
                    if db_embedding:
                        val = cosine_similarity_manual(db_embedding, embedding)
                        if round(val, 2) >= 0.3:
                            context += doc.get("raw_data", "") + "\n\n"
        except Exception as mongo_err:
            print("⚠️ MongoDB not available or query failed:", mongo_err)
            traceback.print_exc()
            context = ""

        # --- Generate response ---
        if context.strip():
            prompt_template = f"""You are a chatbot meant to answer questions related to animal bites.
Answer the question based on the given context.
Context:
{context}
Question:
{modified_user_input}"""
            bot_response_english = llm.invoke(prompt_template).content
        else:
            bot_response_english = "I am unable to answer your question at the moment. The Doctor has been notified, please check back in a few days."
            try:
                save_unanswered_question(user_input_english)
            except Exception as save_err:
                print("Error saving unanswered question:", save_err)
                traceback.print_exc()

    except Exception as e:
        print("❌ Error in /api/chat:", e)
        traceback.print_exc()
        bot_response_english = "An internal error occurred while processing your request. Please try again."

    # 4) Translate reply back
    try:
        bot_response = translate_text(translator_client, bot_response_english, language, DEFAULT_LANGUAGE) or bot_response_english
    except Exception as e:
        print("Translation back error:", e)
        traceback.print_exc()
        bot_response = bot_response_english

    # 5) Save interaction
    try:
        fallback_msgs = [
            "Sorry, but I specialize in answering questions related to animal bites. I may not be able to help with your query, but if you have any questions about animal bites, their effects, treatment, or prevention, I'd be happy to assist!",
            "I am unable to answer your question at the moment. The Doctor has been notified, please check back in a few days."
        ]
        if bot_response_english and bot_response_english.strip() not in [msg.strip() for msg in fallback_msgs]:
            save_user_interaction(user_input_english, bot_response_english, payload.get("session_id"))
    except Exception as e:
        print("Error saving interaction:", e)
        traceback.print_exc()

    # 6) Generate TTS
    tts_url = None
    try:
        if texttospeech_client and bot_response_english:
            text_hash = hashlib.md5(bot_response_english.encode("utf-8")).hexdigest()
            audio_dir = os.path.join(os.getcwd(), "tts_audio")
            os.makedirs(audio_dir, exist_ok=True)
            audio_filename = f"{text_hash}_{language}.mp3"
            audio_path = os.path.join(audio_dir, audio_filename)

            from google.cloud import texttospeech
            voice_name_map = {
                'en': 'en-US-Wavenet-C',
                'hi': 'hi-IN-Wavenet-C',
                'ta': 'ta-IN-Wavenet-C',
                'te': 'te-IN-Standard-A'
            }
            voice_name = voice_name_map.get(language)
            synthesis_input = texttospeech.SynthesisInput(text=bot_response)
            voice = texttospeech.VoiceSelectionParams(language_code=language, name=voice_name, ssml_gender=texttospeech.SsmlVoiceGender.FEMALE)
            audio_config = texttospeech.AudioConfig(audio_encoding=texttospeech.AudioEncoding.MP3)
            response = texttospeech_client.synthesize_speech(request={"input": synthesis_input, "voice": voice, "audio_config": audio_config})
            with open(audio_path, "wb") as out:
                out.write(response.audio_content)

            tts_url = f"/api/tts/{audio_filename}"
    except Exception as e:
        print("TTS generation error:", e)
        traceback.print_exc()
        tts_url = None

    return jsonify({"reply": bot_response, "tts_url": tts_url})

# Serve TTS files
@app.route("/api/tts/<path:filename>", methods=["GET"])
def serve_tts(filename):
    audio_dir = os.path.join(os.getcwd(), "tts_audio")
    return send_from_directory(audio_dir, filename, mimetype="audio/mpeg")

# Doctor endpoints
@app.route("/api/doctor/unanswered", methods=["GET"])
def api_doctor_unanswered():
    try:
        doctor_doc_ref = db.collection("DOCTOR").document("1")
        doc = doctor_doc_ref.get()
        data = doc.to_dict() if doc.exists else {}
        return jsonify({"qn": data.get("qn", []), "ans": data.get("ans", {})})
    except Exception as e:
        print("Doctor unanswered error:", e)
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route("/api/doctor/queries", methods=["GET"])
def api_doctor_queries():
    try:
        queries_ref = db.collection("user").order_by("timestamp", direction=1).limit(50)
        res = []
        for q in queries_ref.stream():
            obj = q.to_dict()
            ts = obj.get("timestamp")
            if hasattr(ts, "isoformat"):
                obj["timestamp"] = ts.isoformat()
            res.append(obj)
        return jsonify(res)
    except Exception as e:
        print("Doctor queries error:", e)
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route("/api/doctor/answer", methods=["POST"])
def api_doctor_answer():
    data = request.json or {}
    question = data.get("question")
    answer = data.get("answer")
    if not question or not answer:
        return jsonify({"error": "question and answer required"}), 400
    try:
        doctor_doc_ref = db.collection("DOCTOR").document("1")
        doc = doctor_doc_ref.get()
        current = doc.to_dict() if doc.exists else {}
        ans_dict = current.get("ans", {}) or {}
        ans_dict[question] = answer
        doctor_doc_ref.set({"ans": ans_dict}, merge=True)

        from embedding import store_question_answer
        store_question_answer(question, answer)
        return jsonify({"ok": True})
    except Exception as e:
        print("Doctor answer error:", e)
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    

@app.route("/")
def home():
    return "✅ Backend is running! Use /api/chat for the chatbot."


if __name__ == "__main__":
    app.run(debug=True, use_reloader=False, port=int(os.environ.get("PORT", 5000)))


