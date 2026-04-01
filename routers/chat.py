from fastapi import APIRouter, HTTPException, Security
from fastapi.security import HTTPBearer
from pydantic import BaseModel
from qdrant_client import QdrantClient
from langchain_ollama import OllamaEmbeddings
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from groq import Groq
import os
import jwt
from dotenv import load_dotenv

load_dotenv()

security = HTTPBearer()

COLLECTION_NAME = "student_documents"

# Connect to Qdrant
client = QdrantClient(
    url=os.getenv("QDRANT_URL"),
    api_key=os.getenv("QDRANT_API_KEY")
)


# embeddings = HuggingFaceEndpointEmbeddings(
#     model="nomic-ai/nomic-embed-text-v1.5",
#     huggingfacehub_api_token=os.getenv("HUGGINGFACE_API_KEY")
# )

# Embedding model
embeddings = GoogleGenerativeAIEmbeddings(
    model="gemini-embedding-2-preview",
    google_api_key=os.getenv("GEMINI_API_KEY")
)
EMBEDDINGS_SIZE = 3072

# Groq LLM
groq_client = Groq(
    api_key=os.getenv("GROQ_API_KEY")
)



router = APIRouter(prefix="/chat", tags=["chat"])

def get_user_id_from_token(token: str):
    decoded = jwt.decode(token, options={"verify_signature": False})
    return decoded["sub"]


class ChatRequest(BaseModel):
    question : str
    
    
@router.post("/ask")
def ask(request : ChatRequest, credentials = Security(security)):
    try:
        # Get user_id from token
        token = credentials.credentials
        user_id = get_user_id_from_token(token)
        
        # Embed the question
        question_embedding = embeddings.embed_query(request.question)
        
        # Search Qdrant for relevant chunks belonging to this user only 
        results = client.query_points(
            collection_name=COLLECTION_NAME,
            query=question_embedding,
            query_filter={
                "must":[
                    {"key": "user_id", "match": {"value": user_id}}
                ]
            },
            limit=3
        ).points
        
        # Extract the text from the chunks
        context = "\n\n".join([r.payload["text"] for r in results])
        
        # Send to Groq
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": """You are a helpful tutor. Use the context below to answer the question.
                    Explain with examples and don't just give definitions.
                    If the answer is not in the context say 'I don't know based on your document.'"""
                },
                {
                     "role": "user",
                    "content": f"Context:\n{context}\n\nQuestion: {request.question}"
                }
            ]
        )
        
        return{
            "answer": response.choices[0].message.content
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

class SummarizeRequest(BaseModel):
    filename: str

@router.post("/summarize")
def summarize_doc(request: SummarizeRequest, credentials = Security(security)):
    try:
        token = credentials.credentials
        user_id = get_user_id_from_token(token)
        
        # We don't need to embed anything, just fetch all chunks for this doc
        # Alternatively, wait, Qdrant requires a query vector. 
        # Better: we just do a dummy search or scroll through the collection filtering by filename
        
        results = client.scroll(
            collection_name=COLLECTION_NAME,
            scroll_filter={
                "must": [
                    {"key": "user_id", "match": {"value": user_id}},
                    {"key": "filename", "match": {"value": request.filename}}
                ]
            },
            limit=20 # Grab up to 20 chunks to summarize
        )[0]
        
        if not results:
            raise HTTPException(status_code=404, detail="Document not found or empty.")
            
        context = "\n\n".join([r.payload["text"] for r in results])
        
        # Summarize via Groq
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert academic summarizer. Read the provided document context and create a clear, comprehensive summary. Break it down into key points using markdown headers and bullet points. Do not mention the context."
                },
                {
                     "role": "user",
                     "content": f"Please summarize this document:\n\n{context}"
                }
            ]
        )
        
        return {"summary": response.choices[0].message.content}
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


class QuestionerRequest(BaseModel):
    filename: str
    num_questions: int = 5

@router.post("/questioner")
def get_quiz(request: QuestionerRequest, credentials = Security(security)):
    try:
        token = credentials.credentials
        user_id = get_user_id_from_token(token)
        
        results = client.scroll(
            collection_name=COLLECTION_NAME,
            scroll_filter={
                "must": [
                    {"key": "user_id", "match": {"value": user_id}},
                    {"key": "filename", "match": {"value": request.filename}}
                ]
            },
            limit=20 
        )[0]
        
        if not results:
            raise HTTPException(status_code=404, detail="Document not found or empty.")
            
        context = "\n\n".join([r.payload["text"] for r in results])
        
        # Generate JSON quiz via Groq
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": f"You are an expert quiz generator. Generate exactly {request.num_questions} flashcard questions based on the provided text. Return ONLY a valid JSON array of objects with keys 'question' and 'answer'. Do not include markdown formatting or extra text."
                },
                {
                     "role": "user",
                     "content": f"Document text:\n\n{context}"
                }
            ],
            response_format={"type": "json_object"} # Depending on Groq support, or parse string
        )
        
        answer_text = response.choices[0].message.content
        import json
        
        try:
            # If the model wraps it in an object like {"quiz": [...]}
            data = json.loads(answer_text)
            quiz = data.get("quiz") or data.get("questions") or data
            if isinstance(quiz, list):
                return {"quiz": quiz}
            elif isinstance(quiz, dict):
                 # Fallback extract list
                 for k, v in quiz.items():
                     if isinstance(v, list): return {"quiz": v}
            return {"quiz": list(data)}
        except:
             # Fallback parsing
             return {"quiz": [{"question": "Error parsing", "answer": answer_text}]}
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))