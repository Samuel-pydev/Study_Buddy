from fastapi import APIRouter, HTTPException, Security
from fastapi.security import HTTPBearer
from pydantic import BaseModel
from clients import get_qdrant_client, get_embeddings, get_groq_client, get_supabase_client, get_ollama_embeddings
from prompts import BUDDY_SYSTEM_PROMPT
import jwt

security = HTTPBearer()
COLLECTION_NAME_OLLAMA = "student_documents_ollama"

supabase_client = get_supabase_client()
qdrant_client = get_qdrant_client()
embeddings = get_embeddings()
ollama_embeddings = get_ollama_embeddings()
groq_client = get_groq_client()

router = APIRouter(prefix="/chat", tags=["chat"])

def get_user_id_from_token(token: str):
    decoded = jwt.decode(token, options={"verify_signature": False})
    return decoded["sub"]

class ChatRequest(BaseModel):
    question: str
    filename: str
    doc_id: str

@router.post("/ask")
def ask(request: ChatRequest, credentials = Security(security)):
    try:
        token = credentials.credentials
        user_id = get_user_id_from_token(token)

        # Embed the question
        question_embedding = ollama_embeddings.embed_query(request.question)

        # Search Qdrant
        results = qdrant_client.query_points(
            collection_name=COLLECTION_NAME_OLLAMA,
            query=question_embedding,
            query_filter={
                "must": [
                    {"key": "user_id", "match": {"value": user_id}},
                    {"key": "doc_id", "match": {"value": request.doc_id}}  # ✅ fixed
                ]
            },
            limit=5
        ).points

        context = "\n\n".join([r.payload["text"] for r in results])

        # Fetch last 10 messages from Supabase
        history_response = supabase_client.table("chat_history")\
            .select("*")\
            .eq("user_id", user_id)\
            .eq("doc_id", request.doc_id)\
            .order("created_at", desc=False)\
            .limit(15)\
            .execute()

        # Build conversation for Groq
        conversation = []
        for msg in history_response.data:
            conversation.append({
                "role": "user" if msg["role"] == "user" else "assistant",
                "content": msg["message"]
            })

        # Add current question
        conversation.append({
            "role": "user",
            "content": f"Context:\n{context}\n\nQuestion: {request.question}"
        })

        # Send to Groq
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": BUDDY_SYSTEM_PROMPT},
                *conversation
            ]
        )

        answer = response.choices[0].message.content

        # Save to Supabase
        supabase_client.table("chat_history").insert([
            {"user_id": user_id, "filename": request.filename, "doc_id": request.doc_id, "role": "user", "message": request.question},
            {"user_id": user_id, "filename": request.filename, "doc_id": request.doc_id, "role": "ai", "message": answer}
        ]).execute()

        return {"answer": answer}

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/history")
def get_history(filename: str, doc_id: str, credentials = Security(security)):
    try:
        token = credentials.credentials
        user_id = get_user_id_from_token(token)

        response = supabase_client.table("chat_history")\
            .select("*")\
            .eq("user_id", user_id)\
            .eq("doc_id", doc_id)\
            .order("created_at", desc=False)\
            .execute()

        return {"history": response.data}

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))