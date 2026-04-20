import os
from supabase import create_client, Client
from qdrant_client import QdrantClient
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_ollama import OllamaEmbeddings
from pydantic import SecretStr
from groq import Groq
from dotenv import load_dotenv
import httpx 

load_dotenv()

def get_supabase_client() -> Client:
    client = create_client(
        os.getenv("SUPABASE_URL", ""),
        os.getenv("SUPABASE_KEY", ""),
    )
    client.postgrest.session = httpx.Client(http2=False)
    return client


def get_qdrant_client() -> QdrantClient:
    return QdrantClient(
        url=os.getenv("QDRANT_URL", ""),
        api_key=os.getenv("QDRANT_API_KEY", "")
    )

def get_embeddings() -> GoogleGenerativeAIEmbeddings:
    return GoogleGenerativeAIEmbeddings(
        model=os.getenv("EMBEDDING_MODEL", ""),
        api_key=SecretStr(os.getenv("GEMINI_API_KEY", ""))
    )

def get_groq_client() -> Groq:
    return Groq(
        api_key=os.getenv("GROQ_API_KEY", "")
    )

def get_ollama_embeddings(model: str = 'nomic-embed-text') -> OllamaEmbeddings:
    return OllamaEmbeddings(
        model=os.getenv("OLLAMA_EMBEDDING_MODEL", model),
        base_url=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    )