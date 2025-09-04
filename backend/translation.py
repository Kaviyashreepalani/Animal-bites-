import os
import json
import tempfile
import dotenv
dotenv.load_dotenv()
from google.cloud import translate 
from google.cloud import texttospeech 
from google.cloud import speech 
from typing import Optional, List, Type, TypeVar

GCClient = TypeVar('GCClient')
_translator_client = None
_texttospeech_client = None
_speech_client = None

def _initialize_gc_client(client_class: Type[GCClient]) -> Optional[GCClient]:
    try:
        credentials_env = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
        temp_credentials_path = None
        # If the env var looks like a JSON string (starts with '{'), write to temp file
        if credentials_env and credentials_env.strip().startswith('{'):
            with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as temp_file:
                temp_file.write(credentials_env)
                temp_credentials_path = temp_file.name
            os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = temp_credentials_path
        elif credentials_env:
            # Assume it's a file path and set as is
            os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = credentials_env
        # Initialize the client
        client = client_class()
        # Clean up temp file if created
        if temp_credentials_path:
            os.unlink(temp_credentials_path)
        return client
    except Exception as e:
        print(f"Error initializing Google Cloud {client_class.__name__}: {e}")
        return None

def get_translator_client() -> Optional[translate.TranslationServiceClient]:
    global _translator_client
    if _translator_client is None:
        _translator_client = _initialize_gc_client(translate.TranslationServiceClient)
    return _translator_client

def get_texttospeech_client() -> Optional[texttospeech.TextToSpeechClient]:
    global _texttospeech_client
    if _texttospeech_client is None:
        _texttospeech_client = _initialize_gc_client(texttospeech.TextToSpeechClient)
    return _texttospeech_client

def get_speech_client() -> Optional[speech.SpeechClient]:
    global _speech_client
    if _speech_client is None:
        _speech_client = _initialize_gc_client(speech.SpeechClient)
    return _speech_client

def get_supported_languages(client, allowed_langs: Optional[List[str]] = None) -> dict[str, str]:
    if not client:
        return {}
    try:
        project_id = os.environ.get("GOOGLE_CLOUD_PROJECT")
        parent = f"projects/{project_id}/locations/global"
        response = client.get_supported_languages(parent=parent, display_language_code='en')

        languages = {}
        for lang in response.languages:
            if allowed_langs and lang.language_code not in allowed_langs:
                continue

            display_name = lang.display_name if lang.display_name else lang.language_code
            languages[lang.language_code] = display_name
        return languages
    except Exception as e:
        print(f"Error fetching supported languages (V3): {e}")
        return {}

def translate_text(client, text: Optional[str], target_language_code: str, source_language_code: str) -> Optional[str]:
    if not text or not client:
        return text

    if source_language_code == target_language_code:
        return text

    try:
        project_id = os.environ.get("GOOGLE_CLOUD_PROJECT")
        parent = f"projects/{project_id}/locations/global"
        
        print(f"DEBUG: Translating '{text[:50]}...' FROM {source_language_code} TO {target_language_code}")
        
        response = client.translate_text(
            request={
                "parent": parent,
                "contents": [text],
                "mime_type": "text/plain",
                "source_language_code": source_language_code,
                "target_language_code": target_language_code,
            }
        )
        translated_text = response.translations[0].translated_text
        print(f"DEBUG: Translation result: '{translated_text[:50]}...'")
        return translated_text
    except Exception as e:
        print(f"Error translating text (V3): {e}")
        print(f"Failed translation: '{text}' from {source_language_code} to {target_language_code}")
        return text  # Return original text instead of None on error

# Helper functions to access other secrets
def get_openai_key() -> str:
    return os.environ.get("OPENAI_KEY", "")

def get_mongodb_uri() -> str:
    return os.environ.get("MONGODB_URI", "")

def get_firebase_service_account_key():
    firebase_key = os.environ.get("FIREBASE_SERVICE_ACCOUNT_KEY")
    if firebase_key:
        return json.loads(firebase_key)
    return firebase_key

def get_google_cloud_project() -> str:
    return os.environ.get("GOOGLE_CLOUD_PROJECT", "")