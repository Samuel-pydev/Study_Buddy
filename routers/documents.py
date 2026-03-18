from fastapi import HTTPException, UploadFile, File, APIRouter
from fastapi.security import HTTPBearer
from fastapi import Security
from qdrant_client import QdrantClient
from qdrant_client.models import PointStruct, VectorParams, Distance
from langchain_classic.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PyMuPDFLoader
from langchain_ollama import OllamaEmbeddings
import os
import jwt
import uuid
import tempfile
from dotenv import load_dotenv

load_dotenv()