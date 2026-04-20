from fastapi import HTTPException, UploadFile, File, APIRouter
from fastapi.security import HTTPBearer
from fastapi import Security
from qdrant_client.models import PointStruct, VectorParams, Distance, PayloadSchemaType
from langchain_classic.text_splitter import RecursiveCharacterTextSplitter
from langchain_classic.schema import Document
from clients import get_embeddings, get_qdrant_client, get_supabase_client, get_ollama_embeddings
import os 
import jwt
import uuid
import tempfile
from markitdown import MarkItDown
from dotenv import load_dotenv

load_dotenv()

security = HTTPBearer()

# Connect to Qdrant
client = get_qdrant_client()

#Connect to Supabase
supabase_client = get_supabase_client()

# Embedding model
embeddings = get_ollama_embeddings()

EMBEDDINGS_SIZE = 3072
OLLAMA_EMBEDDING_SIZE = 768
COLLECTION_NAME = "student_documents"
COLLECTION_NAME_OLLAMA = "student_documents_ollama"

router = APIRouter(prefix="/documents", tags=["documents"])


def generate_doc_id():

    doc_id=str(uuid.uuid4())
    return doc_id

# To create Collection
def create_collection_if_not_exist():
    existing = client.get_collections()
    collection_names = [c.name for c in existing.collections]
    
    if COLLECTION_NAME not in collection_names:
        client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(
                size=EMBEDDINGS_SIZE,
                distance=Distance.COSINE
            )
        )
        print(f"Collection '{COLLECTION_NAME}' created!")
    else:
        print(f"Collection '{COLLECTION_NAME}' already exists!")


def create_collection_ollama_if_not_exist():
    existing = client.get_collections()
    collection_names = [c.name for c in existing.collections]
    
    if COLLECTION_NAME_OLLAMA not in collection_names:
        client.create_collection(
            collection_name=COLLECTION_NAME_OLLAMA,
            vectors_config=VectorParams(
                size=OLLAMA_EMBEDDING_SIZE,
                distance=Distance.COSINE
            )
        )
        print(f"Collection '{COLLECTION_NAME_OLLAMA}' created!")
    else:
        print(f"Collection '{COLLECTION_NAME_OLLAMA}' already exists!")


create_collection_if_not_exist()
create_collection_ollama_if_not_exist()

# Create index on user_id
client.create_payload_index(
    collection_name=COLLECTION_NAME_OLLAMA,
    field_name="user_id",
    field_schema=PayloadSchemaType.KEYWORD
)

# Create index on doc_id
client.create_payload_index(
    collection_name=COLLECTION_NAME_OLLAMA,
    field_name="doc_id",
    field_schema=PayloadSchemaType.KEYWORD
)

def get_user_id_from_token(token: str):
    decoded = jwt.decode(token, options={"verify_signature": False})
    return decoded["sub"]



@router.post("/upload")
async def upload(uploaded: UploadFile = File(...), credentials = Security(security)):
    try:
        token = credentials.credentials
        user_id = get_user_id_from_token(token)
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            tmp.write(await uploaded.read())
            tmp_path = tmp.name
            
        md = MarkItDown()
        result = md.convert(tmp_path)
        documents = [Document(page_content=result.text_content)]
                
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=500,
            chunk_overlap=50
        )
        
        chunks = splitter.split_documents(documents)
        
        doc_id = generate_doc_id()
        points = []
        for chunk in chunks:
            embedding = embeddings.embed_query(chunk.page_content)
            points.append(PointStruct(
                id=str(uuid.uuid4()),
                vector=embedding,
                payload={
                    "text": chunk.page_content,
                    "user_id": user_id,
                    "filename": uploaded.filename,
                    "doc_id": doc_id,
                }
            ))
            
                    
        if not points:
            raise HTTPException(status_code=400, detail="No chunks were extracted from the document")
        
        batch_size = 50
        for i in range(0, len(points), batch_size):
            batch = points[i:i + batch_size]
            client.upsert(
            collection_name=COLLECTION_NAME_OLLAMA,
            points=batch
        )
        print(f"Uploaded Batch {i//batch_size + 1}")
        
        supabase_client.table("documents").insert({
            "user_id": user_id,
            "filename": uploaded.filename,
            "chunks": len(chunks),
            "doc_id": doc_id, 
        }).execute()
        
        os.unlink(tmp_path)
        
        return{
            "message": "Document Uploaded Successfully",
            "filename": uploaded.filename,
            "doc_id": doc_id,
            "chunks" : len(chunks)
        }
        
    except Exception as e:
        print(f"Upload error: {e}")  # this will print in your terminal
        import traceback
        traceback.print_exc()  # this prints the full traceback
        raise HTTPException(status_code=400, detail=str(e))
    
@router.get("/my-documents")
def get_documents(credentials = Security(security)):
    try:
        token = credentials.credentials
        user_id = get_user_id_from_token(token)
        
        response = supabase_client.table("documents")\
            .select("*")\
            .eq("user_id", user_id)\
            .order("created_at", desc=True)\
            .execute()
        return {"documents": response.data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))