# ⚖️ AI Judge — Automated Hackathon Evaluation Platform

AI Judge is an automated evaluation platform designed to streamline and standardize the assessment of hackathon submissions. By combining automated document parsing, speech-to-text transcript analysis, and custom evaluation criteria, AI Judge assists judges and organizers in scoring projects accurately, fairly, and efficiently.

---

## ✨ Features

* **📄 Document & OCR Processing:** Extracts text from submission PDFs, decks, and documentation automatically.
* **🎙️ Audio/Video Transcription:** Uses speech-to-text models to process project pitch recordings and demo videos.
* **🤖 AI Evaluation Pipeline:** Analyzes submission content against custom hackathon rubrics to generate scores and feedback.
* **📊 Interactive Dashboard:** A React frontend allowing judges to review evaluations, compare submissions side-by-side, and manage hackathon details.
* **💬 Assistant Support:** An integrated assistant view for quick project queries and detailed criteria breakdowns.

---

## 🛠️ Tech Stack

* **Frontend:** React, React Router, Context API
* **Backend:** Python (FastAPI / Flask / App Runner)
* **Database & Storage:** MongoDB
* **AI & Processing Models:** PyTorch, Custom NLP / LLM Evaluators, OCR Processors, Speech-to-Text (STT)

---

## 📁 Repository Structure

```text
ai_judge/
├── backend/
│   ├── ai_service.py      # Core AI inference logic
│   ├── app.py             # Main backend API entry point
│   ├── database.py        # Database connection & models
│   ├── evaluator.py       # Submission evaluation pipeline
│   ├── ocr_processor.py   # Document text extraction
│   ├── stt_processor.py   # Speech-to-text processing
│   ├── requirements.txt   # Python dependencies
│   └── render.yaml        # Deployment configuration
├── frontend/
│   ├── public/            # Static web assets
│   └── src/
│       ├── components/    # Shared UI elements
│       ├── context/       # Auth and app state
│       └── pages/         # Dashboard, Evaluate, Compare pages
└── docs/                  # Additional documentation
