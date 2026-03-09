# Arc 4.1 – AI Chat Assistant

Arc 4.1 is a **production-ready AI chat application** with **Retrieval-Augmented Generation (RAG)** support. It is built for real-time conversations, document-aware responses, and a clean, developer-friendly workflow.

---

## Project Structure

arc-4.1/
├── backend/ # FastAPI backend (Python)
└── frontend/ # React + TypeScript frontend

yaml
Copy code

The backend handles model interaction, streaming responses, and RAG logic.  
The frontend provides a responsive and intuitive chat interface.

---

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

3. Open the Application
Open your browser and navigate to:

arduino
Copy code
http://localhost:3000
Configuration
API Key (Required)
Create or edit the file backend/.env and add your API key:

ini
Copy code
OPENROUTER_API_KEY=your_key_here
The application will not function without a valid API key.

Features
💬 Real-time streaming chat responses

📚 Document upload and retrieval (RAG)

🌓 Dark and light theme support

💾 Persistent chat history

⌨️ Keyboard shortcuts (⌘N for new chat, Esc to cancel)

🔄 Automatic retry on errors