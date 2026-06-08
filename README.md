# TWIN::AI — AI Learning Digital Twin

> A personalized, gamified AI learning platform powered by **Gemini** and **NVIDIA APIs** — built with a cyberpunk terminal aesthetic, adaptive AI tutoring, and a manual rep-based progression system.

LIVE LINK :-https://ai-learning-digital-twin.onrender.com
 
<img width="1361" height="877" alt="image" src="https://github.com/user-attachments/assets/37d9206a-2e86-4b3a-a923-9764e2b4ed9a" />
<img width="1692" height="881" alt="image" src="https://github.com/user-attachments/assets/0174cf26-b046-4553-81e8-e58d84a9358a" />
<img width="1626" height="888" alt="image" src="https://github.com/user-attachments/assets/b77844f4-5928-42d5-8252-3c28c554e690" />
<img width="1365" height="823" alt="image" src="https://github.com/user-attachments/assets/4ef3339c-b5c5-49fe-a70e-6e3aa30c500b" />
<img width="1602" height="902" alt="image" src="https://github.com/user-attachments/assets/b67e6295-db1a-4223-b857-83f681533f91" />
<img width="1223" height="747" alt="image" src="https://github.com/user-attachments/assets/6153901c-472d-4d6e-bcb3-4a34a1517fd3" />

---

## What It Does

TWIN::AI is a browser-based adaptive learning dashboard that acts as your personal AI study companion. You pick the topics you want to learn, optionally set a goal, and the system builds a personalized roadmap — then guides you through it with AI-powered explanations, quizzes, and a rep-based manual progression system.

**The core mechanic:** progress is intentionally manual. Your mastery percentage only increases when you log a real study session — the system doesn't auto-complete anything. This makes your "digital twin" an honest reflection of your actual effort, not a simulated one. The AI advisor uses this real data to give you genuinely personalized guidance.

---

## How It Works

### 1. Onboarding
- Pick **at least 2 topics** from 12 pre-built AI/ML modules
- Optionally set a **learning goal** (Get a job in AI, Build projects, Research, Personal curiosity) — this is optional but helps the AI advisor tailor its recommendations
- On initialization, the AI generates a **recommended study order** based on your selections

### 2. Manual Rep System (Progress)
- Your mastery percentage **only goes up when you manually log a session** — there is no auto-progression
- In the **Log Session** tab, you select a topic, set duration (5–180 min), and self-assess your mastery (0–100%)
- XP is calculated from your input: `XP = (minutes × 1.5) + (mastery × 0.8)`
- This keeps your digital twin honest — if you don't study, your twin doesn't grow

### 3. Topic Unlocking
- Topics are **locked by default** — you can't jump ahead
- A topic unlocks only after you reach sufficient progress on the current one
- This enforces a **progressive learning path** — you build on foundations before moving forward

### 4. AI-Powered Quizzes
- At any point in your current topic, you can **quiz yourself**
- Click the topic → Gemini 2.5 Flash generates **5 MCQs live** specific to that topic
- Correct answers highlight green, wrong highlight orange with the correct answer shown
- Quiz score is saved to your profile
- Scoring **≤ 59%** unlocks the next topic — the system rewards honest assessment over perfect scores

### 5. AI Advisor
- The advisor receives your **full learning profile as context** on every query: level, XP, streak, completed topics, in-progress mastery, average score
- Ask anything — it gives advice based on where you actually are, not generic tips
- Quick prompts: what to study next, weakest areas, 2-week plan, project ideas, interview prep, coding challenge, time estimate

### 6. AI Chat
- Multi-turn conversational AI tutor — explain any concept, ask follow-up questions
- Teaching style adapts to your level: beginner uses analogies, intermediate balances theory and examples, advanced goes deep
- Suggested prompts to get started

### 7. Topic Recap (Log Session)
- After selecting a topic in the Log Session tab, click **"Explain This Topic"**
- Gemini generates a short, practical recap of that topic — what it is, why it matters, one real-world example
- Designed as a quick refresher before you log your session.

 ### 8. Session Activity Log
- Every study session you log is recorded in the **Activity** tab with timestamp, topic, duration, mastery score, and XP gained
- Full history persists via `localStorage` — nothing is lost on refresh
- Activity feed updates in real-time after every session sync

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla HTML, CSS, JavaScript (single file) |
| Backend | Node.js (native `http` module, no Express) |
| AI APIs | Google Gemini 2.0 Flash, Gemini 2.5 Flash, NVIDIA MiniMax M2.7 |
| Fonts | Orbitron, Share Tech Mono (Google Fonts) |
| Storage | Browser `localStorage` for persistence |
| Config | `dotenv` for API key management |

---

## Architecture

```
browser (twin_ai_enhanced.html)
        │
        │  POST /ask  { model, messages[] }
        ▼
server_enhanced.js (Node.js, port 4000)
        │
        ├── Gemini provider → generativelanguage.googleapis.com
        │       └── convertToGeminiFormat() → contents[] + system instruction injection
        │       └── callGeminiWithRetry() → auto-retry on 429 with backoff
        │
        └── NVIDIA provider → integrate.api.nvidia.com
                └── convertToOpenAIFormat() → standard OpenAI-compatible payload
```

**Rate limit protection:** Gemini requests are throttled with a 4-second minimum gap per model. On 429 errors, the server auto-retries up to 3 times with exponential backoff — extracting `retry_in` from the error message if available.

**Context injection:** Every AI advisor/chat request includes the learner's full profile as a system prompt — level, XP, streak, completed topics, in-progress mastery — so responses are always personalized.

---

## Setup

### Prerequisites
- Node.js v18+
- Google Gemini API key → [aistudio.google.com](https://aistudio.google.com)
- NVIDIA API key → [integrate.api.nvidia.com](https://integrate.api.nvidia.com)

### Installation

```bash
git clone https://github.com/shresalix2006/ai-learning-digital-twin.git
cd ai-learning-digital-twin/files
npm install
cp .env.example .env
# Add your actual API keys to .env
```

### Environment Variables

```
GEMINI_API_KEY=your_gemini_key_here
NVIDIA_API_KEY=your_nvidia_key_here
```

> ⚠️ Never commit your `.env` file. It's already in `.gitignore`.

### Run

```bash
node server_enhanced.js
```

Open: **http://localhost:4000**

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Serves the frontend app |
| `GET` | `/models` | Returns available AI models |
| `POST` | `/ask` | Sends message to selected AI model |

### POST `/ask`

```json
// Request
{
  "model": "gemini-2.5-flash",
  "messages": [
    { "role": "system", "content": "learner profile context..." },
    { "role": "user", "content": "What should I study next?" }
  ]
}

// Response
{
  "choices": [{ "message": { "role": "assistant", "content": "..." } }]
}
```

---

## Available Topics

| Topic | Subtopics |
|---|---|
| 🐍 Python for AI | Numpy · Pandas · Matplotlib |
| 📐 ML Fundamentals | Regression · Classification · Clustering |
| 🧠 Neural Networks | Backprop · Activations · Optimizers |
| 🔮 Transformers & Attention | Self-attention · BERT · GPT |
| 💬 Prompt Engineering | Zero-shot · Few-shot · Chain-of-thought |
| 👁️ Computer Vision | CNNs · Object Detection · Segmentation |
| 🎮 Reinforcement Learning | MDPs · Q-Learning · PPO |
| ⚙️ LLM Fine-tuning | LoRA · RLHF · Instruction tuning |
| 🗄️ Data Engineering | Pipelines · ETL · Feature stores |
| 🚀 MLOps & Deployment | Docker · CI/CD · Model serving |
| 📝 NLP Fundamentals | Tokenization · Embeddings · BERT |
| ⚖️ AI Ethics & Safety | Bias · Fairness · Alignment |

---

## Project Structure

```
files/
├── twin_ai_enhanced.html     # Main frontend (single-file app)
├── server_enhanced.js        # Node.js backend + multi-provider API proxy
├── .env                      # API keys (not committed)
├── .env.example              # Template for env setup
├── .gitignore
├── package.json
└── package-lock.json
```

---

## Built By

**Shrestha Chatterjee** — B.Tech CSE (AI/ML), SRMIST Delhi-NCR + B.S. Data Science, IIT Madras

· [LinkedIn](https://www.linkedin.com/in/shrestha-chatterjee-421a27332)
