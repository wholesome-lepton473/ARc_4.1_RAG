# ARc_4.1
RAG Application 
---------------------------------------------------------------------------------------------------------------------------------------------------

# Arc 4.1 – AI Chat Assistant

Arc 4.1 is a **production-ready AI chat application** with **Retrieval-Augmented Generation (RAG)** support. It is built for real-time conversations, document-aware responses, and a clean, developer-friendly workflow.

---

## Project Structure
```bash
arc-4.1/
├── backend/ # FastAPI backend (Python)
└── frontend/ # React + TypeScript frontend
```

The backend handles model interaction, streaming responses, and RAG logic.  
The frontend provides a responsive and intuitive chat interface.

---
 create a .env in the Backend -directory 

add the below content and pass your openrouter API-key and tevily API-Key : 
```bash
-------------------------------------------------------------------------
# OpenRouter API Configuration
OPENROUTER_API_KEY=your_openrouter_api_key_here

# Tavily Web Search (optional but recommended)
TAVILY_API_KEY=your_tavily_api_key_here

# Default LLM Model (reliable free models: google/gemma-3-1b-it:free, meta-llama/llama-3.2-1b-instruct:free)
DEFAULT_MODEL=google/gemma-3-1b-it:free

# Database

# Vector Database (ChromaDB)
CHROMA_PERSIST_DIRECTORY=./chroma_db
# embedding Model
EMBEDDING_MODEL=all-MiniLM-L6-v2

# CORS (comma-separated origins)
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# Server Configuration
DEBUG=false
LOG_LEVEL=INFO

------------------------------------------------------------------------------------------
```

## Getting Started

### 1. Start the Backend

```bash
cd backend
.\venv\Scripts\activate        # Windows
pip install -r requirements.txt   # Run once
uvicorn main:app --reload --port 8000
This starts the FastAPI server on port 8000.

2. Start the Frontend
bash
Copy code
cd frontend
npm install    # Run once
npm run dev
The frontend development server will start automatically.


Features
💬 Real-time streaming chat responses

📚 Document upload and retrieval (RAG)

🌓 Dark and light theme support

💾 Persistent chat history

⌨️ Keyboard shortcuts (⌘N for new chat, Esc to cancel)

🔄 Automatic retry on errors
