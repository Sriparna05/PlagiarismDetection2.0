# Plagiarism Detection - AI-Powered Tool

![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)

This project is a full-stack web application designed to detect potential plagiarism in text documents. It leverages advanced Natural Language Processing (NLP) and Machine Learning models to perform semantic analysis, comparing user-submitted content against a pre-existing corpus of documents.

---

### ⚠️ Deployment Note

Please note: This project is intended to be run locally. Due to the large size of the machine learning models required by `spaCy` and `sentence-transformers` (often exceeding 1-2 GB), deploying the Python backend on standard free-tier cloud services is challenging. These platforms often have storage or memory limitations that are exceeded during the build process (`Building wheel for blis...`).

**A successful live deployment would require a paid plan with higher resource allocations** (e.g., more RAM and disk space) on a platform like Render, Google Cloud, or a more powerful Hugging Face Space.

---

### ✨ Key Features

- **Text & File Upload:** Analyze text by pasting it directly or by uploading `.txt`, `.pdf`, and `.docx` files.
- **Semantic AI Analysis:** Uses Sentence-BERT models to understand the _meaning_ of sentences, not just keyword matching.
- **Vector-Based Search:** Employs a vector database (ChromaDB) to efficiently find semantically similar sentences from a large corpus.
- **Visual Report:** Displays results in a clean, modern UI with a doughnut chart showing the originality score.
- **Highlighted Text:** Highlights the specific sentences flagged for potential plagiarism directly in the user's document.
- **Detailed Breakdown:** Provides a card-based view of each potential match, showing the source document, similarity score, and the matched text.

---

### ⚙️ How It Works - Architecture

The application uses a microservice-based architecture composed of three main parts:

1.  **Frontend (Vanilla JS, HTML, CSS):** A sleek, modern user interface for text input and displaying results. It communicates with the Node.js backend.
2.  **Backend Gateway (Node.js + Express):** Acts as a gateway that handles user requests, manages file uploads, and communicates with the Python AI service.
3.  **Python AI Service (Flask + ML Libraries):** The core of the application. It handles:
    - Loading a corpus of documents from a local folder on startup.
    - Preprocessing text with `spaCy`.
    - Generating vector embeddings with `Sentence-Transformers`.
    - Storing and querying vectors in `ChromaDB`.
    - Returning a detailed JSON analysis to the Node.js backend.

---

### 🛠️ Tech Stack

| Layer             | Tools & Technologies                                             |
| ----------------- | ---------------------------------------------------------------- |
| **Frontend**      | HTML5, CSS3, Vanilla JavaScript, Chart.js                        |
| **Backend**       | Node.js, Express.js                                              |
| **AI / NLP**      | Python, Flask, spaCy, Sentence-Transformers (`all-MiniLM-L6-v2`) |
| **Vector DB**     | ChromaDB                                                         |
| **File Handling** | Multer (in Node.js)                                              |

---

### 📂 Folder Structure

```
/plagiacheck-app
├── backend/
│   ├── node_modules/
│   ├── uploads/
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── index.html
│   ├── script.js
│   └── styles.css
├── python-service/
│   ├── corpus_documents/   <-- Add your reference documents here
│   ├── temp_uploads/
│   ├── venv/
│   ├── app.py
│   └── requirements.txt
└── README.md
```

---

### 🚀 How to Run the Project Locally

To run this application on your local machine, you will need to have three separate terminals open.

#### **Prerequisites**

- [Node.js and npm](https://nodejs.org/en/)
- [Python 3.9+](https://www.python.org/downloads/)
- [Git](https://git-scm.com/)

#### **Step 1: Clone the Repository**

```bash
git clone <your-repository-url>
cd plagiacheck-app
```

#### **Step 2: Set Up the Python AI Service**

(Open your 1st terminal here)

```bash
# Navigate to the Python service directory
cd python-service

# Create and activate a virtual environment
python -m venv venv
# On Windows:
.\venv\Scripts\Activate.ps1
# On macOS/Linux:
# source venv/bin/activate

# Install the required Python packages
pip install -r requirements.txt

# IMPORTANT: Add your reference documents (.txt, .pdf, .docx)
# into the `corpus_documents` folder. The app needs these to check against.
# The server will not start without this folder.

# Run the Python server
python app.py
```

This server will run on `http://127.0.0.1:5001`. Keep this terminal running.

#### **Step 3: Set Up the Node.js Backend**

(Open your 2nd terminal here)

```bash
# Navigate to the backend directory from the root folder
cd backend

# Install npm packages
npm install

# Run the Node.js server
npm start
```

This server will run on `http://localhost:3000`. Keep this terminal running.

#### **Step 4: Launch the Frontend**

(You can use a 3rd terminal or your file explorer)

1.  **Install the Live Server extension** for VS Code if you haven't already.
2.  In VS Code, go to the `frontend` folder, right-click on `index.html`.
3.  Select **"Open with Live Server"**.
4.  Your browser will open to a URL like `http://127.0.0.1:5500/frontend/index.html`. This is your application. You can now upload files or paste text to check for plagiarism.
