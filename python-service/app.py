import os
import spacy
import chromadb
from flask import Flask, request, jsonify
from flask_cors import CORS
from sentence_transformers import SentenceTransformer
from pypdf import PdfReader
from docx import Document

# --- Initialization ---
app = Flask(__name__)
CORS(app)  # Enable Cross-Origin Resource Sharing

# Ensure the 'chroma_db' directory exists for persistent storage
DB_PATH = "chroma_db"
if not os.path.exists(DB_PATH):
    os.makedirs(DB_PATH)

# Load NLP model (spaCy for sentence splitting)
print("Loading spaCy model...")
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    print("Downloading 'en_core_web_sm' model...")
    spacy.cli.download("en_core_web_sm")
    nlp = spacy.load("en_core_web_sm")
print("spaCy model loaded.")

# Load Sentence Transformer model
print("Loading Sentence Transformer model...")
model = SentenceTransformer('all-MiniLM-L6-v2')
print("Sentence Transformer model loaded.")

# Initialize ChromaDB client and collection
client = chromadb.PersistentClient(path=DB_PATH)
collection = client.get_or_create_collection(name="plagiarism_docs")

# --- Helper Functions ---
def extract_text(file_stream, file_name):
    """Extracts text from various file types."""
    extension = os.path.splitext(file_name)[1].lower()
    if extension == '.pdf':
        reader = PdfReader(file_stream)
        return "".join(page.extract_text() for page in reader.pages)
    elif extension == '.docx':
        doc = Document(file_stream)
        return "\n".join(para.text for para in doc.paragraphs)
    elif extension == '.txt':
        return file_stream.read().decode('utf-8')
    return None

def preprocess_text(text):
    """Splits text into sentences using spaCy."""
    doc = nlp(text)
    return [sent.text.strip() for sent in doc.sents if len(sent.text.strip()) > 15]

# --- API Endpoints ---
@app.route('/add-document', methods=['POST'])
def add_document():
    """Endpoint to add a document to the vector database."""
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    try:
        source_text = extract_text(file.stream, file.filename)
        if not source_text:
            return jsonify({"error": "Unsupported file type or empty file"}), 400
        
        sentences = preprocess_text(source_text)
        if not sentences:
            return jsonify({"error": "No content to process in the document"}), 400
            
        embeddings = model.encode(sentences).tolist()
        doc_ids = [f"{file.filename}-{i}" for i in range(len(sentences))]
        
        collection.add(
            embeddings=embeddings,
            documents=sentences,
            metadatas=[{"source": file.filename}] * len(sentences),
            ids=doc_ids
        )
        return jsonify({"message": f"Successfully added '{file.filename}' to the corpus."}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/analyze', methods=['POST'])
def analyze_text():
    """Endpoint to analyze text/file for plagiarism."""
    input_text = ""
    if 'file' in request.files:
        file = request.files['file']
        if file.filename:
            try:
                input_text = extract_text(file.stream, file.filename)
            except Exception as e:
                return jsonify({"error": f"Error processing file: {str(e)}"}), 500
    elif 'text' in request.json:
        input_text = request.json['text']

    if not input_text or len(input_text.strip()) < 20:
        return jsonify({"error": "Text is too short to analyze."}), 400

    user_sentences = preprocess_text(input_text)
    if not user_sentences:
        return jsonify({"error": "Could not extract valid sentences from the input."}), 400

    user_embeddings = model.encode(user_sentences)

    plagiarized_count = 0
    detailed_results = []
    
    if collection.count() == 0:
        return jsonify({
            "plagiarism_percentage": 0,
            "unique_percentage": 100,
            "details": [],
            "original_text": input_text,
            "message": "Warning: The document corpus is empty. Add documents for comparison."
        }), 200

    for i, sentence in enumerate(user_sentences):
        query_embedding = user_embeddings[i].tolist()
        
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=1
        )
        
        is_plagiarized = False
        if results['distances'] and results['distances'][0]:
            distance = results['distances'][0][0]
            similarity = 1 - distance
            
            # THRESHOLD = 80%
            if similarity >= 0.80:
                is_plagiarized = True
                plagiarized_count += 1
                matched_sentence = results['documents'][0][0]
                source = results['metadatas'][0][0]['source']
                detailed_results.append({
                    "user_sentence": sentence,
                    "matched_sentence": matched_sentence,
                    "similarity": round(similarity * 100, 2),
                    "source": source
                })

    total_sentences = len(user_sentences)
    plagiarism_percentage = (plagiarized_count / total_sentences) * 100 if total_sentences > 0 else 0

    return jsonify({
        "plagiarism_percentage": round(plagiarism_percentage, 2),
        "unique_percentage": round(100 - plagiarism_percentage, 2),
        "details": detailed_results,
        "original_text": input_text
    })

if __name__ == '__main__':
    print("Starting Flask server...")
    app.run(host='0.0.0.0', port=5001, debug=True)