from fastapi import HTTPException, UploadFile, File, APIRouter
from fastapi.security import HTTPBearer
from fastapi import Security
from supabase import create_client
from qdrant_client import QdrantClient
from qdrant_client.models import PointStruct, VectorParams, Distance, PayloadSchemaType
from langchain_classic.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PyMuPDFLoader
from langchain_ollama import OllamaEmbeddings
from langchain_google_genai import GoogleGenerativeAIEmbeddings
import os 
import jwt
import uuid
import tempfile
from dotenv import load_dotenv

load_dotenv()

security = HTTPBearer()

# Connect to Qdrant
client = QdrantClient(
    url=os.getenv("QDRANT_URL"),
    api_key=os.getenv("QDRANT_API_KEY")
)

# embeddings = HuggingFaceEndpointEmbeddings(
#     model="sentence-transformers/all-MiniLM-L6-v2",
#     huggingfacehub_api_token=os.getenv("HUGGINGFACE_API_KEY")
# )

# Embedding model
embeddings = GoogleGenerativeAIEmbeddings(
    model="gemini-embedding-2-preview",
    google_api_key=os.getenv("GEMINI_API_KEY")
)
EMBEDDINGS_SIZE = 3072

COLLECTION_NAME = "student_documents"

router = APIRouter(prefix="/documents", tags=["documents"])

supabase_client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_KEY")
)

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

create_collection_if_not_exist()

# Create index on user_id
client.create_payload_index(
    collection_name=COLLECTION_NAME,
    field_name="user_id",
    field_schema=PayloadSchemaType.KEYWORD
)

# Create index on filename so we can query by it later
client.create_payload_index(
    collection_name=COLLECTION_NAME,
    field_name="filename",
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
            
        loader = PyMuPDFLoader(tmp_path)
        documents = loader.load()
        
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=500,
            chunk_overlap=50
        )
        
        chunks = splitter.split_documents(documents)
        
        points = []
        for chunk in chunks:
            embedding = embeddings.embed_query(chunk.page_content)
            points.append(PointStruct(
                id=str(uuid.uuid4()),
                vector=embedding,
                payload={
                    "text": chunk.page_content,
                    "user_id": user_id,
                    "filename": uploaded.filename
                }
            ))
            
        # client.upsert(
        #     collection_name=COLLECTION_NAME,
        #     points=points
        
        if not points:
            raise HTTPException(status_code=400, detail="No chunks were extracted from the document")
        
        batch_size = 50
        for i in range(0, len(points), batch_size):
            batch = points[i:i + batch_size]
            client.upsert(
            collection_name=COLLECTION_NAME,
            points=batch
        )
        print(f"Uploaded Batch {i//batch_size + 1}")
        
        supabase_client.table("documents").insert({
            "user_id": user_id,
            "filename": uploaded.filename,
            "chunks": len(chunks)
        }).execute()
        
        os.unlink(tmp_path)
        
        return{
            "message": "Document Uploaded Successfully",
            "filename": uploaded.filename,
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