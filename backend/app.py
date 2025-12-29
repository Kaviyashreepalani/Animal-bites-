from flask import Flask, render_template, request, jsonify, session, send_file
import os
import numpy as np
import dotenv
import uuid
import io
import os
import google.generativeai as genai


from location_service import search_facilities_by_location
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from pymongo.mongo_client import MongoClient
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field, SecretStr
from typing import Literal, List, Optional
from flask import request, jsonify
import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from google.cloud import translate, texttospeech, speech
from translation import (
    get_translator_client,
    get_texttospeech_client,
    get_speech_client,
    translate_text,
    get_supported_languages,
)
from forward import (
    save_unanswered_question,
    save_user_interaction,
    get_unanswered_questions,
    submit_answer,
    get_user_queries,
    add_question_answer,
    get_daily_stats,
    get_solved_questions,
    update_solved_question,
    delete_solved_question,
)
from flask_cors import CORS

# Initialize Flask app
frontend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../frontend"))
app = Flask(
    __name__,
    template_folder=os.path.join(frontend_path),
    static_folder=os.path.join(frontend_path),
)

# CRITICAL: More permissive CORS configuration
CORS(app, resources={
    r"/api/*": {
        "origins": "*",
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Accept"],
        "expose_headers": ["Content-Type", "Content-Length", "Content-Disposition"],
        "supports_credentials": True,
        "max_age": 3600
    }
})


# Add CORS headers to all responses
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response


app.secret_key = os.urandom(24)

from dotenv import load_dotenv
load_dotenv(dotenv_path=".env", override=True)


# Globals
translator_client = None
texttospeech_client = None
speech_client = None
SUPPORTED_LANGUAGES = {}

embeddings_model = None
llm = None
smaller_llm = None
larger_llm = None
collection = None

ALLOWED_LANGUAGES: List[str] = ["en", "ta", "te", "hi"]
DEFAULT_LANGUAGE: Literal["en"] = "en"

# Map to Google TTS/STT codes
LANGUAGE_CODE_MAP = {
    "en": {"tts": "en-US", "voice": "en-US-Wavenet-C"},
    "hi": {"tts": "hi-IN", "voice": "hi-IN-Wavenet-C"},
    "ta": {"tts": "ta-IN", "voice": "ta-IN-Wavenet-A"},
    "te": {"tts": "te-IN", "voice": "te-IN-Standard-A"},
}


def initialize_app():
    # 🔴 GLOBALS MUST COME FIRST
    global translator_client, texttospeech_client, speech_client, SUPPORTED_LANGUAGES
    global embeddings_model, llm, smaller_llm, larger_llm, collection

    # -------- GEMINI SETUP (FREE) --------
    gemini_key = os.getenv("GEMINI_API_KEY")
    if gemini_key:
        genai.configure(api_key=gemini_key)
        print("✅ Gemini API initialized")
    else:
        print("⚠️ GEMINI_API_KEY not found")

    # -------- EXISTING CODE (UNCHANGED) --------
    if not os.getenv("GOOGLE_APPLICATION_CREDENTIALS"):
        raise ValueError("GOOGLE_APPLICATION_CREDENTIALS not set.")


    # Validate Google Cloud Project ID
    project_id = os.getenv("GOOGLE_CLOUD_PROJECT", "").strip()
    if not project_id:
        print("WARNING: GOOGLE_CLOUD_PROJECT not set. Translation features will be limited.")
    else:
        print(f"INFO: Using Google Cloud Project: {project_id}")

    translator_client = get_translator_client()
    texttospeech_client = get_texttospeech_client()
    speech_client = get_speech_client()

    if not SUPPORTED_LANGUAGES:
        SUPPORTED_LANGUAGES = get_supported_languages(
            translator_client, allowed_langs=ALLOWED_LANGUAGES
        )
        print(f"INFO: Loaded {len(SUPPORTED_LANGUAGES)} supported languages: {list(SUPPORTED_LANGUAGES.keys())}")

    openai_api_key_secret = SecretStr(os.environ.get("OPENAI_KEY"))
    embeddings_model = OpenAIEmbeddings(
        model="text-embedding-3-large", api_key=openai_api_key_secret
    )
    llm = ChatOpenAI(model="gpt-3.5-turbo-0125", temperature=0, api_key=openai_api_key_secret)
    smaller_llm = ChatOpenAI(temperature=0, model="gpt-4o-mini", api_key=openai_api_key_secret)
    larger_llm = ChatOpenAI(temperature=0, model="gpt-4o", api_key=openai_api_key_secret)

    try:
        client = MongoClient(os.environ.get("MONGODB_URI"))
        db = client["pdf_file"]
        collection = db["animal_bites"]
        _ = db.list_collection_names()
        print("INFO: MongoDB connection successful")
    except Exception as e:
        raise ConnectionError(f"Failed to connect to MongoDB: {e}")


def cosine_similarity_manual(vec1, vec2):
    vec1 = np.array(vec1)
    vec2 = np.array(vec2)
    dot_product = np.dot(vec1, vec2)
    norm_vec1 = np.linalg.norm(vec1)
    norm_vec2 = np.linalg.norm(vec2)
    if norm_vec1 == 0 or norm_vec2 == 0:
        return 0.0
    return dot_product / (norm_vec1 * norm_vec2)


def get_doctor_answers():
    """Get all doctor-provided answers from Firebase"""
    try:
        from forward import db

        doc = db.collection("DOCTOR").document("1").get()
        if doc.exists:
            data = doc.to_dict()
            return data.get("ans", {})
        return {}
    except Exception as e:
        print(f"ERROR: Failed to get doctor answers: {e}")
        return {}


tagging_prompt = ChatPromptTemplate.from_template(
    """
Extract the desired information from the following passage.
Only extract the properties mentioned in the 'Classification' function.
Passage:
{input}
"""
)


class CasualSubject(BaseModel):
    description: str = Field(
        description="""Classify the given user query into one of two categories:
Casual Greeting - If the query is a generic greeting or social pleasantry (e.g., 'Hi', 'How are you?', 'Good morning').
Subject-Specific - If the query is about a particular topic or seeks information (e.g., 'What is Python?', 'Tell me about space travel').
Return only the category name: 'Casual Greeting' or 'Subject-Specific'.""",
    )
    category: Literal["Casual Greeting", "Subject-Specific"] = Field(
        description="The classified category of the user query."
    )


class RelatedNot(BaseModel):
    description: str = Field(
        description="""Determine whether the given user query is related to animal bites.
Categories:
Animal Bite-Related - If the query mentions animal bites, their effects, treatment, prevention, or specific cases (e.g., 'What to do after a dog bite?', 'Are cat bites dangerous?').
Not Animal Bite-Related - If the query does not pertain to animal bites.
Return only the category name: 'Animal Bite-Related' or 'Not Animal Bite-Related'.""",
    )
    category: Literal["Animal Bite-Related", "Not Animal Bite-Related"] = Field(
        description="The classified category regarding animal bite relevance."
    )


def gemini_generate(prompt: str) -> str:
    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        print("Gemini error:", e)
        return "⚠️ AI service is temporarily unavailable."


def initialize_session():
    if "chat_history" not in session:
        session["chat_history"] = []
    if "selected_language" not in session:
        session["selected_language"] = DEFAULT_LANGUAGE
    if "session_id" not in session:
        session["session_id"] = str(uuid.uuid4())


@app.route("/")
def index():
    initialize_session()
    return render_template(
        "index.html", supported_languages=SUPPORTED_LANGUAGES, selected_language=session["selected_language"]
    )


@app.route("/api/set_language", methods=["POST"])
def set_language():
    data = request.json
    new_language = data.get("language", DEFAULT_LANGUAGE)
    if new_language in ALLOWED_LANGUAGES:
        session["selected_language"] = new_language
        session["chat_history"] = []  # Clear chat history when language changes
        print(f"DEBUG: Language set to: {new_language}")
        return jsonify({"success": True, "language": new_language})
    else:
        return jsonify({"success": False, "error": "Unsupported language"}), 400


# Helper function for better doctor answer matching
def best_match_question(user_query, candidate_questions, embeddings_model):
    query_embedding = embeddings_model.embed_query(user_query)
    best_score = 0.0
    best_question = None
    for candidate in candidate_questions:
        candidate_embedding = embeddings_model.embed_query(candidate)
        score = cosine_similarity_manual(query_embedding, candidate_embedding)
        if score > best_score:
            best_score = score
            best_question = candidate
    return best_question if best_score >= 0.80 else None  # Threshold can be adjusted


@app.route("/api/process_message", methods=["POST"])
def process_message():
    initialize_session()
    data = request.json
    user_input_original = data.get("message", "").strip()
    if not user_input_original:
        return jsonify({"error": "Empty message"})

    # Prefer session language if already set, otherwise use request
    if "language" in data and data["language"] and data["language"] != "en":
        session["selected_language"] = data["language"]

    current_selected_language = session.get("selected_language", DEFAULT_LANGUAGE)


    print(f"DEBUG: Selected language from request: {current_selected_language}")
    print(f"DEBUG: User input original: {user_input_original}")

    # Translate input to English for processing if not already English
    if current_selected_language != DEFAULT_LANGUAGE:
        print(f"DEBUG: Translating from {current_selected_language} to {DEFAULT_LANGUAGE}")
        user_input_english_raw = translate_text(translator_client, user_input_original, DEFAULT_LANGUAGE, current_selected_language)
        user_input_english: str = user_input_english_raw if user_input_english_raw else user_input_original
        print(f"DEBUG: Translation result: '{user_input_english}'")
    else:
        user_input_english = user_input_original

    if not user_input_english or not user_input_english.strip():
        user_input_english = user_input_original
    print(f"DEBUG: User input in English: {user_input_english}")

    chat_history = session.get("chat_history", [])

    # Rephrase user input for LLM context
    retrieval_prompt_template = f"""Given a chat_history and the latest_user_input question/statement \
which MIGHT reference context in the chat history, formulate a standalone question/statement \
which can be understood without the chat history. Do NOT answer the question, \
If the latest_user_input is a pleasantry (e.g., 'thank you', 'thanks', 'got it', 'okay'), return it as is without modification. Otherwise, ensure the reformulated version is self-contained.\
chat_history: {chat_history}
latest_user_input:{user_input_english}"""

    try:
        modified_user_input_result = larger_llm.invoke(retrieval_prompt_template).content
        modified_user_input: str = (
            modified_user_input_result if isinstance(modified_user_input_result, str) else ""
        )
        if not modified_user_input.strip():
            modified_user_input = user_input_english
    except Exception as e:
        print(f"DEBUG: Error modifying user input: {e}")
        modified_user_input = user_input_english

    print(f"DEBUG: Modified user input: {modified_user_input}")

    # Classify query type (Casual Greeting vs. Subject-Specific)
    classification_category = "Subject-Specific"  # Default to subject-specific
    try:
        response_casual_subject = smaller_llm.with_structured_output(CasualSubject).invoke(
            tagging_prompt.invoke({"input": modified_user_input})
        )
        classification_category = (
            response_casual_subject.category
            if isinstance(response_casual_subject, CasualSubject)
            else response_casual_subject.get("category", "Subject-Specific")
        )
    except Exception as e:
        print(f"DEBUG: Error classifying query type: {e}. Assuming Subject-Specific.")
    print(f"DEBUG: Classification: {classification_category}")

    bot_response_english: Optional[str] = None

    if classification_category == "Subject-Specific":
        try:
            # First check doctor-provided answers
            doctor_answers = get_doctor_answers()
            print(f"DEBUG: Doctor answers available: {len(doctor_answers)} questions")
            found_doctor_answer = False

            # Initialize embeddings_model once per request for matching
            embeddings_model_local = OpenAIEmbeddings(
                model="text-embedding-3-large", api_key=os.environ.get("OPENAI_KEY")
            )

            matched_question = best_match_question(modified_user_input, list(doctor_answers.keys()), embeddings_model_local)

            if matched_question:
                bot_response_english = doctor_answers[matched_question]
                found_doctor_answer = True
                print(f"DEBUG: Found doctor answer for: {matched_question}")

            if not found_doctor_answer:
                # Vector search for relevant content in MongoDB
                embedding = embeddings_model.embed_query(modified_user_input)
                result = collection.aggregate(
                    [
                        {
                            "$vectorSearch": {
                                "index": "vector_index",
                                "path": "embeddings",
                                "queryVector": embedding,
                                "numCandidates": 100,
                                "limit": 5,
                            }
                        }
                    ]
                )
                context = ""
                for doc in result:
                    db_embedding = doc.get("embeddings", doc.get("embedding", []))
                    if db_embedding:
                        val = cosine_similarity_manual(db_embedding, embedding)
                        print(f"DEBUG: Similarity score: {val}")
                        if round(val, 2) >= 0.55:
                            raw_data = doc.get("raw_data")
                            if raw_data:
                                context += raw_data + "\n\n"
                            else:
                                # New format from doctor answers
                                question = doc.get("question", "")
                                answer = doc.get("answer", "")
                                if question and answer:
                                    context += f"Q: {question}\nA: {answer}\n\n"
                if context.strip():
                    prompt_template = f"""you are a chatbot meant to answer questions related to animal bites, answer the question based on the given context.
context:{context}
question:{modified_user_input}"""
                    response_llm_english_result = llm.invoke(prompt_template).content
                    bot_response_english =  gemini_generate(prompt_template)  
                       
                    print(f"DEBUG: Generated response from context")
                else:
                    # No relevant context found - check relevance
                    relevance_category = "Animal Bite-Related"  # Default to Animal Bite-Related
                    try:
                        response_related_not = smaller_llm.with_structured_output(RelatedNot).invoke(
                            tagging_prompt.invoke({"input": modified_user_input})
                        )
                        relevance_category = (
                            response_related_not.category
                            if isinstance(response_related_not, RelatedNot)
                            else response_related_not.get("category", "Animal Bite-Related")
                        )
                    except Exception as e:
                        print(f"DEBUG: Error classifying relevance: {e}. Assuming Animal Bite-Related.")
                    if relevance_category == "Not Animal Bite-Related":
                        bot_response_english = (
                            "Sorry, but I specialize in answering questions related to animal bites. "
                            "I may not be able to help with your query, but if you have any questions about animal bites, "
                            "their effects, treatment, or prevention, I'd be happy to assist!"
                        )
                    else:
                        bot_response_english = (
                            "I am unable to answer your question at the moment. The Doctor has been notified, please check back in a few days."
                        )
                        try:
                            # ONLY save once here - don't save again in save_user_interaction
                            save_unanswered_question(user_input_english)
                            print(f"DEBUG: Saved unanswered question: {user_input_english}")
                        except Exception as e:
                            print(f"DEBUG: Error forwarding question to doctor: {e}")
        except Exception as e:
            print(f"DEBUG: Error during subject-specific processing: {e}")
            bot_response_english = "An internal error occurred while processing your request. Please try again."
    else:
        # Handle casual conversation
        try:
            bot_response_english_result = llm.invoke(
                f"""system:you are a friendly chatbot that specializes in medical questions related to animal bites.
question: {user_input_english}"""
            ).content
            bot_response_english = (
                bot_response_english_result if isinstance(bot_response_english_result, str) else None
            )
        except Exception as e:
            print(f"DEBUG: Error during casual greeting processing: {e}")
            bot_response_english = "An internal error occurred while generating a greeting. Please try again."

    print(f"DEBUG: Bot response in English: {bot_response_english}")

    # Translate response to selected language if not English
    if current_selected_language != DEFAULT_LANGUAGE and bot_response_english:
        print(f"DEBUG: Translating response from {DEFAULT_LANGUAGE} to {current_selected_language}")
        bot_response = translate_text(
            translator_client, bot_response_english, current_selected_language, DEFAULT_LANGUAGE
        )
        print(f"DEBUG: Translated response: '{bot_response}'")
    else:
        bot_response = bot_response_english

    if not bot_response or not bot_response.strip():
        bot_response = bot_response_english
    print(f"DEBUG: Final response: {bot_response}")

    # Save user interaction (now without duplicate save)
    try:
        user_session_id = session.get("session_id")
        save_user_interaction(user_input_english, bot_response_english, user_session_id)
    except Exception as e:
        print(f"DEBUG: Error saving user interaction: {e}")

    # Update chat history
    chat_history.append([user_input_original, bot_response])
    session["chat_history"] = chat_history[-10:]  # Keep last 10 exchanges

    return jsonify({"reply": bot_response, "chat_history": chat_history})


# Dashboard API Endpoints (keeping all existing endpoints as-is)
@app.route('/api/dashboard/stats', methods=['GET'])
def dashboard_stats():
    try:
        stats = get_daily_stats()
        return jsonify({
            "success": True,
            "stats": stats
        }), 200
    except Exception as e:
        print(f"ERROR in dashboard_stats: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route("/api/dashboard/unanswered-questions", methods=["GET"])
def get_unanswered_questions_api():
    try:
        questions = get_unanswered_questions()
        
        logger.info(f"Fetched {len(questions)} unanswered questions")
        
        return jsonify({
            "success": True,
            "unanswered_questions": questions,
            "total": len(questions),
            "status_code": 200
        }), 200
        
    except Exception as e:
        logger.error(f"Failed to fetch unanswered questions: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e),
            "unanswered_questions": [],
            "total": 0,
            "status_code": 500
        }), 500


@app.route('/api/dashboard/submit-answer', methods=['POST'])
def submit_answer_endpoint():
    try:
        data = request.get_json()
        
        if not data:
            logger.warning("Empty request received")
            return jsonify({
                "success": False,
                "error": "No data provided",
                "status_code": 400
            }), 400
        
        question = data.get('question', '').strip()
        answer = data.get('answer', '').strip()
        
        if not question or not answer:
            logger.warning(f"Missing required fields: question={bool(question)}, answer={bool(answer)}")
            return jsonify({
                "success": False,
                "error": "Question and answer are required",
                "status_code": 400
            }), 400
        
        logger.info(f"Attempting to submit answer for question: {question}")
        
        result = submit_answer(question, answer)
        
        if result:
            logger.info("Answer submitted successfully")
            return jsonify({
                "success": True,
                "message": "Answer submitted successfully",
                "status_code": 200
            }), 200
        else:
            logger.error("Failed to submit answer")
            return jsonify({
                "success": False,
                "error": "Failed to submit answer",
                "status_code": 500
            }), 500
        
    except Exception as e:
        logger.error(f"Error in submit_answer_endpoint: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e),
            "status_code": 500
        }), 500

@app.route('/api/dashboard/user-queries', methods=['GET'])
def get_queries():
    try:
        queries = get_user_queries()
        return jsonify({
            "success": True,
            "user_queries": queries
        }), 200
    except Exception as e:
        print(f"ERROR in get_queries: {e}")
        return jsonify({
            "success": False,
            "error": str(e),
            "user_queries": []
        }), 500


@app.route('/api/dashboard/add-qa', methods=['POST'])
def add_qa_endpoint():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                "success": False,
                "error": "No data provided"
            }), 400
        
        question = data.get('question', '').strip()
        answer = data.get('answer', '').strip()
        
        if not question or not answer:
            return jsonify({
                "success": False,
                "error": "Question and answer are required"
            }), 400
        
        add_question_answer(question, answer)
        
        return jsonify({
            "success": True,
            "message": "Q&A added successfully"
        }), 200
        
    except Exception as e:
        print(f"ERROR in add_qa_endpoint: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route('/api/dashboard/solved-questions', methods=['GET'])
def get_solved():
    try:
        questions = get_solved_questions()
        return jsonify({
            "success": True,
            "solved_questions": questions
        }), 200
    except Exception as e:
        print(f"ERROR in get_solved: {e}")
        return jsonify({
            "success": False,
            "error": str(e),
            "solved_questions": []
        }), 500


@app.route('/api/dashboard/update-solved-question', methods=['POST'])
def update_solved():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                "success": False,
                "error": "No data provided"
            }), 400
        
        doc_id = data.get('id', '').strip()
        question = data.get('question', '').strip()
        answer = data.get('answer', '').strip()
        
        if not doc_id or not question or not answer:
            return jsonify({
                "success": False,
                "error": "ID, question and answer are required"
            }), 400
        
        update_solved_question(doc_id, question, answer)
        
        return jsonify({
            "success": True,
            "message": "Question updated successfully"
        }), 200
        
    except Exception as e:
        print(f"ERROR in update_solved: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route('/api/dashboard/delete-solved-question', methods=['POST'])
def delete_solved():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                "success": False,
                "error": "No data provided"
            }), 400
        
        doc_id = data.get('id', '').strip()
        
        if not doc_id:
            return jsonify({
                "success": False,
                "error": "ID is required"
            }), 400
        
        delete_solved_question(doc_id)
        
        return jsonify({
            "success": True,
            "message": "Question deleted successfully"
        }), 200
        
    except Exception as e:
        print(f"ERROR in delete_solved: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# CRITICAL FIX: Enhanced TTS endpoint with better audio handling
@app.route("/api/tts", methods=["POST", "OPTIONS"])
def tts():
    """Text-to-Speech endpoint with robust error handling and CORS support"""
    
    # Handle preflight request
    if request.method == "OPTIONS":
        response = app.response_class(status=200)
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Accept'
        response.headers['Access-Control-Expose-Headers'] = 'Content-Type, Content-Length, Accept-Ranges'
        return response
    
    initialize_session()
    data = request.json
    text = data.get("text", "")
    language = data.get("language", session.get("selected_language", DEFAULT_LANGUAGE))
    session["selected_language"] = language
    
    if not text:
        logger.error("TTS: No text provided")
        return jsonify({"error": "No text provided"}), 400
    
    if not texttospeech_client:
        logger.error("TTS: Client not available")
        return jsonify({"error": "Text-to-speech service not available"}), 503
    
    logger.info(f"TTS Request - Text: '{text[:50]}...', Language: {language}")
    
    try:
        voice_data = LANGUAGE_CODE_MAP.get(language, LANGUAGE_CODE_MAP["en"])
        synthesis_input = texttospeech.SynthesisInput(text=text)

        voice_name_map = {
            "en": "en-US-Wavenet-C",
            "hi": "hi-IN-Wavenet-C",
            "ta": "ta-IN-Wavenet-C",
            "te": "te-IN-Standard-A",
        }
        voice_name = voice_name_map.get(language)
        voice = texttospeech.VoiceSelectionParams(
            language_code=voice_data["tts"],
            name=voice_name if voice_name else None,
            ssml_gender=texttospeech.SsmlVoiceGender.FEMALE,
        )

        # CRITICAL: Use LINEAR16 for better browser compatibility
        audio_config = texttospeech.AudioConfig(
            audio_encoding=texttospeech.AudioEncoding.MP3,
            speaking_rate=1.0,
            pitch=0.0,
            sample_rate_hertz=24000  # Standard MP3 sample rate
        )

        logger.info("TTS: Calling Google TTS API...")
        response_tts = texttospeech_client.synthesize_speech(
            request={"input": synthesis_input, "voice": voice, "audio_config": audio_config}
        )
        
        audio_content = response_tts.audio_content
        logger.info(f"TTS: Success! Generated {len(audio_content)} bytes of audio")

        if len(audio_content) == 0:
            logger.error("TTS: Generated empty audio content")
            return jsonify({"error": "Generated empty audio"}), 500

        # Create response with proper headers for audio streaming
        response = app.response_class(
            response=audio_content,
            status=200,
            mimetype="audio/mpeg"
        )
        
        # CRITICAL: Set all necessary headers for browser audio playback
        response.headers['Content-Type'] = 'audio/mpeg'
        response.headers['Content-Length'] = str(len(audio_content))
        response.headers['Accept-Ranges'] = 'bytes'
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Expose-Headers'] = 'Content-Length, Content-Type, Accept-Ranges'
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
        response.headers['Content-Disposition'] = 'inline'  # Tell browser to play, not download
        
        logger.info("TTS: Sending response with audio")
        return response
        
    except Exception as e:
        logger.error(f"TTS: Failed with error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Text-to-speech failed: {str(e)}"}), 500


@app.route("/api/stt", methods=["POST"])
def stt():
    """Speech-to-Text endpoint with robust error handling"""
    initialize_session()
    
    if "file" not in request.files:
        return jsonify({"error": "No audio file provided"}), 400
    
    if not speech_client:
        logger.error("STT: Client not available")
        return jsonify({"error": "Speech-to-text service not available"}), 503
    
    form_language = request.form.get("language")
    current_selected_language = (
        form_language if form_language in ALLOWED_LANGUAGES else session.get("selected_language", DEFAULT_LANGUAGE)
    )
    session["selected_language"] = current_selected_language 
    voice_data = LANGUAGE_CODE_MAP.get(current_selected_language, LANGUAGE_CODE_MAP["en"])
    audio_file = request.files["file"]
    audio_content = audio_file.read()
    
    logger.info(f"STT: Language: {current_selected_language}, Audio size: {len(audio_content)} bytes")
    
    try:
        audio = speech.RecognitionAudio(content=audio_content)
        config = speech.RecognitionConfig(
            encoding=speech.RecognitionConfig.AudioEncoding.WEBM_OPUS,
            sample_rate_hertz=48000,
            language_code=voice_data["tts"],
            alternative_language_codes=[voice_data["tts"]],
            enable_automatic_punctuation=True,
        )
        response = speech_client.recognize(config=config, audio=audio)
        
        transcript = ""
        for result in response.results:
            transcript += result.alternatives[0].transcript
        
        if not transcript:
            logger.warning("STT: No transcript generated")
            return jsonify({"error": "Could not transcribe audio. Please try again."}), 400
        
        logger.info(f"STT: Transcript: {transcript}")
        return jsonify({"transcript": transcript})
        
    except Exception as e:
        logger.error(f"STT: Failed with error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Speech-to-text failed: {str(e)}"}), 500


@app.route("/api/get_chat_history")
def get_chat_history():
    initialize_session()
    return jsonify({"chat_history": session.get("chat_history", [])})


# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({
        "success": False,
        "error": "Endpoint not found"
    }), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        "success": False,
        "error": "Internal server error"
    }), 500

@app.errorhandler(400)
def bad_request(error):
    return jsonify({
        "success": False,
        "error": "Bad request"
    }), 400


@app.route('/api/location/search-facilities', methods=['POST', 'OPTIONS'])
def search_facilities_endpoint():
    """
    API endpoint to search for nearby animal bite treatment facilities
    
    Request JSON:
    {
        "location": "Chennai, Tamil Nadu",
        "radius_km": 10  (optional, default 10)
    }
    
    Response JSON:
    {
        "success": true,
        "location": {
            "lat": 13.0827,
            "lon": 80.2707,
            "display_name": "Chennai, Tamil Nadu, India"
        },
        "facilities": [
            {
                "name": "Government Hospital",
                "type": "hospital",
                "lat": 13.08,
                "lon": 80.27,
                "distance_km": 2.5,
                "phone": "+91...",
                "address": "...",
                "maps_url": "https://www.google.com/maps/search/..."
            }
        ],
        "total_found": 10
    }
    """
    # Handle preflight OPTIONS request
    if request.method == 'OPTIONS':
        response = app.response_class(status=200)
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Accept'
        return response
    
    # Handle POST request
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                "success": False,
                "error": "No data provided"
            }), 400
        
        location_query = data.get('location', '').strip()
        radius_km = data.get('radius_km', 10)
        
        if not location_query:
            return jsonify({
                "success": False,
                "error": "Location is required"
            }), 400
        
        # Validate radius
        try:
            radius_km = int(radius_km)
            if radius_km < 1 or radius_km > 50:
                radius_km = 10
        except (ValueError, TypeError):
            radius_km = 10
        
        logger.info(f"Searching facilities near: {location_query}, radius: {radius_km}km")
        
        # Search facilities
        result = search_facilities_by_location(location_query, radius_km)
        
        if result["success"]:
            logger.info(f"Found {result.get('total_found', 0)} facilities")
            return jsonify(result), 200
        else:
            logger.warning(f"Location search failed: {result.get('error')}")
            return jsonify(result), 404
        
    except Exception as e:
        logger.error(f"Error in search_facilities_endpoint: {str(e)}")
        return jsonify({
            "success": False,
            "error": f"Internal server error: {str(e)}",
            "facilities": []
        }), 500


if __name__ == "__main__":
    try:
        initialize_app()
        print("="*60)
        print("🚀 Application initialized successfully!")
        print(f"📝 Supported languages: {ALLOWED_LANGUAGES}")
        print(f"☁️  Google Cloud Project: {os.getenv('GOOGLE_CLOUD_PROJECT', 'NOT SET')}")
        print(f"🌍 Translation client: {'✓' if translator_client else '✗'}")
        print(f"🔊 Text-to-Speech client: {'✓' if texttospeech_client else '✗'}")
        print(f"🎤 Speech-to-Text client: {'✓' if speech_client else '✗'}")
        print("="*60)
        app.run(debug=False, use_reloader=False, host="0.0.0.0", port=5000)
    except Exception as e:
        print(f"❌ Failed to initialize application: {e}")
        import traceback
        traceback.print_exc()
        raise