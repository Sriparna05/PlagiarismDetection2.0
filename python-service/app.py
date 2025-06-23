import os
import spacy
import chromadb
from flask import Flask, request, jsonify
from flask_cors import CORS
from sentence_transformers import SentenceTransformer
from pypdf import PdfReader
from docx import Document
import atexit

# --- Initialization ---
app = Flask(__name__)
CORS(app)  # Enable Cross-Origin Resource Sharing

# Use an in-memory ephemeral database for simplicity in deployment
# This means the DB is rebuilt every time the server starts.
client = chromadb.Client() 
collection = client.get_or_create_collection(name="plagiarism_docs")

# --- Model Loading ---
print("Loading spaCy model...")
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    print("Downloading 'en_core_web_sm' model...")
    spacy.cli.download("en_core_web_sm")
    nlp = spacy.load("en_core_web_sm")
print("spaCy model loaded.")

print("Loading Sentence Transformer model...")
model = SentenceTransformer('all-MiniLM-L6-v2')
print("Sentence Transformer model loaded.")

# --- Helper Functions ---
def extract_text(file_path):
    """Extracts text from various file types by path."""
    file_stream = open(file_path, 'rb')
    file_name = os.path.basename(file_path)
    extension = os.path.splitext(file_name)[1].lower()
    
    text = ""
    if extension == '.pdf':
        try:
            reader = PdfReader(file_stream)
            text = "".join(page.extract_text() for page in reader.pages)
        except Exception as e:
            print(f"Error reading PDF {file_name}: {e}")
    elif extension == '.docx':
        doc = Document(file_stream)
        text = "\n".join(para.text for para in doc.paragraphs)
    elif extension == '.txt':
        text = file_stream.read().decode('utf-8', errors='ignore')
        
    file_stream.close()
    return text

def preprocess_text(text):
    """Splits text into sentences using spaCy."""
    doc = nlp(text)
    return [sent.text.strip() for sent in doc.sents if len(sent.text.strip()) > 15]

def load_corpus():
    """Loads all documents from the 'corpus_documents' folder into ChromaDB."""
    corpus_folder = 'corpus_documents'
    if not os.path.exists(corpus_folder):
        print(f"Warning: Corpus directory '{corpus_folder}' not found. No documents will be loaded.")
        return

    print("Loading documents from corpus...")
    processed_files = 0
    for filename in os.listdir(corpus_folder):
        file_path = os.path.join(corpus_folder, filename)
        if os.path.isfile(file_path):
            try:
                print(f"Processing: {filename}")
                source_text = extract_text(file_path)
                if not source_text:
                    continue

                sentences = preprocess_text(source_text)
                if not sentences:
                    continue
                
                # Generate unique IDs for each sentence
                doc_ids = [f"{filename}-{i}" for i in range(len(sentences))]
                
                collection.add(
                    documents=sentences,
                    metadatas=[{"source": filename}] * len(sentences),
                    ids=doc_ids
                )
                processed_files += 1
            except Exception as e:
                print(f"Failed to process {filename}: {e}")

    print(f"Corpus loading complete. Processed {processed_files} documents. Total sentences in DB: {collection.count()}")

# --- API Endpoint ---
@app.route('/analyze', methods=['POST'])
def analyze_text():
    """Endpoint to analyze text/file for plagiarism."""
    input_text = ""
    if 'file' in request.files:
        file = request.files['file']
        if file.filename:
            # We need to save the file temporarily to use extract_text by path
            temp_path = os.path.join("temp_uploads", file.filename)
            os.makedirs("temp_uploads", exist_ok=True)
            file.save(temp_path)
            try:
                input_text = extract_text(temp_path)
            finally:
                os.remove(temp_path) # Clean up temp file
    elif 'text' in request.json:
        input_text = request.json['text']

    if not input_text or len(input_text.strip()) < 20:
        return jsonify({"error": "Text is too short to analyze."}), 400

    user_sentences = preprocess_text(input_text)
    if not user_sentences:
        return jsonify({"error": "Could not extract valid sentences from the input."}), 400

    if collection.count() == 0:
        return jsonify({
            "plagiarism_percentage": 0,
            "unique_percentage": 100,
            "details": [],
            "original_text": input_text,
            "message": "Warning: The document corpus is empty. Analysis may be inaccurate."
        }), 200
        
    user_embeddings = model.encode(user_sentences)

    plagiarized_count = 0
    detailed_results = []
    
    for i, sentence in enumerate(user_sentences):
        query_embedding = user_embeddings[i].tolist()
        
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=1
        )
        
        if results['distances'] and results['distances'][0]:
            distance = results['distances'][0][0]
            similarity = 1 - distance
            
            # SIMILARITY THRESHOLD = 80%
            if similarity >= 0.80:
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

# Cleanup temp_uploads folder on exit
def cleanup_temp_folder():
    if os.path.exists("temp_uploads"):
        import shutil
        shutil.rmtree("temp_uploads")
        print("Cleaned up temp_uploads folder.")

atexit.register(cleanup_temp_folder)

if __name__ == '__main__':
    load_corpus() # Load documents on startup
    app.run(host='0.0.0.0', port=5001, debug=True)