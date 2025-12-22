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
            try:
                os.unlink(temp_credentials_path)
            except:
                pass
                
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
    """Get supported languages - with fallback if API call fails"""
    if not client:
        print("WARNING: No translation client available, using fallback languages")
        return get_fallback_languages(allowed_langs)
    
    try:
        project_id = os.environ.get("GOOGLE_CLOUD_PROJECT", "").strip()
        
        # Validate project_id format - must be lowercase, alphanumeric with hyphens
        if not project_id or not is_valid_project_id(project_id):
            print(f"WARNING: Invalid or missing GOOGLE_CLOUD_PROJECT: '{project_id}'")
            print("Expected format: lowercase letters, numbers, and hyphens only")
            print("Using fallback language list")
            return get_fallback_languages(allowed_langs)
        
        parent = f"projects/{project_id}/locations/global"
        print(f"DEBUG: Fetching languages with parent: {parent}")
        
        response = client.get_supported_languages(parent=parent, display_language_code='en')

        languages = {}
        for lang in response.languages:
            if allowed_langs and lang.language_code not in allowed_langs:
                continue

            display_name = lang.display_name if lang.display_name else lang.language_code
            languages[lang.language_code] = display_name
        
        print(f"DEBUG: Successfully fetched {len(languages)} languages")
        return languages
        
    except Exception as e:
        print(f"Error fetching supported languages (V3): {e}")
        print("Using fallback language list")
        return get_fallback_languages(allowed_langs)

def is_valid_project_id(project_id: str) -> bool:
    """Validate Google Cloud Project ID format"""
    if not project_id:
        return False
    
    # Project ID must:
    # - contain only lowercase letters, digits, or hyphens
    # - start with a lowercase letter
    # - be 6-30 characters long
    # - NOT contain periods or colons (those are for special resource formats)
    import re
    pattern = r'^[a-z][a-z0-9\-]{5,29}$'
    return bool(re.match(pattern, project_id))

def get_fallback_languages(allowed_langs: Optional[List[str]] = None) -> dict[str, str]:
    """Return fallback language mappings"""
    all_languages = {
        'en': 'English',
        'hi': 'Hindi',
        'ta': 'Tamil',
        'te': 'Telugu'
    }
    
    if allowed_langs:
        return {k: v for k, v in all_languages.items() if k in allowed_langs}
    
    return all_languages

def translate_text(client, text: Optional[str], target_language_code: str, source_language_code: str) -> Optional[str]:
    """Translate text with robust error handling"""
    if not text or not text.strip():
        return text

    if source_language_code == target_language_code:
        return text

    if not client:
        print(f"WARNING: No translation client available. Returning original text.")
        return text

    try:
        project_id = os.environ.get("GOOGLE_CLOUD_PROJECT", "").strip()
        
        # Validate project_id
        if not project_id or not is_valid_project_id(project_id):
            print(f"ERROR: Invalid or missing GOOGLE_CLOUD_PROJECT: '{project_id}'")
            print("Translation disabled. Please set a valid project ID.")
            print("Format: lowercase letters, numbers, and hyphens only (e.g., 'my-project-123')")
            return text
        
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
        print(f"Failed translation: '{text[:50]}...' from {source_language_code} to {target_language_code}")
        return text  # Return original text instead of None on error

# Helper functions to access other secrets
def get_openai_key() -> str:
    return os.environ.get("OPENAI_KEY", "")

def get_mongodb_uri() -> str:
    return os.environ.get("MONGODB_URI", "")

def get_firebase_service_account_key():
    firebase_key = os.environ.get("FIREBASE_SERVICE_ACCOUNT_KEY")
    if firebase_key:
        try:
            return json.loads(firebase_key)
        except:
            return firebase_key
    return None

def get_google_cloud_project() -> str:
    return os.environ.get("GOOGLE_CLOUD_PROJECT", "")