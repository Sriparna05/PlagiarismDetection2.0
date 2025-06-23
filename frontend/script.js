document.addEventListener('DOMContentLoaded', () => {
    const BACKEND_URL = 'http://localhost:3000';
    const form = document.getElementById('plagiarismForm');
    const textInput = document.getElementById('textInput');
    const fileInput = document.getElementById('fileInput');
    const resultsSection = document.getElementById('resultsSection');
    const loadingDiv = document.getElementById('loading');
    const errorMessageDiv = document.getElementById('errorMessage');

    // Corpus Management Elements
    const corpusFileInput = document.getElementById('corpusFileInput');
    const addCorpusBtn = document.getElementById('addCorpusBtn');
    const corpusMessage = document.getElementById('corpusMessage');
    
    // --- Corpus Management Logic ---
    addCorpusBtn.addEventListener('click', async () => {
        if (corpusFileInput.files.length === 0) {
            alert('Please select a file to add to the corpus.');
            return;
        }

        const formData = new FormData();
        formData.append('file', corpusFileInput.files[0]);

        corpusMessage.textContent = 'Uploading and processing...';
        corpusMessage.className = 'message';
        
        try {
            const response = await fetch(`${BACKEND_URL}/api/add-document`, {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || 'Failed to add document.');
            }
            
            corpusMessage.textContent = result.message;
            corpusMessage.className = 'message success';
            corpusFileInput.value = ''; // Reset file input
        } catch (error) {
            corpusMessage.textContent = `Error: ${error.message}`;
            corpusMessage.className = 'message error';
        }
    });

    // --- Plagiarism Check Logic ---
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData();
        const text = textInput.value;
        const file = fileInput.files[0];

        if (!text.trim() && !file) {
            alert('Please provide text or upload a file.');
            return;
        }

        // If a file is selected, it takes precedence
        if (file) {
            formData.append('file', file);
        } else {
            // A bit of a trick for sending text with multipart/form-data expectation
            // Or we can adjust backend, but let's stick to one formData object
            // This is actually better handled by checking content-type in backend
            // For now, we will send as JSON if no file
        }

        // Show loading spinner and hide previous results/errors
        loadingDiv.classList.remove('hidden');
        resultsSection.classList.add('hidden');
        errorMessageDiv.classList.add('hidden');

        try {
            let response;
            if(file){
                response = await fetch(`${BACKEND_URL}/api/check`, {
                    method: 'POST',
                    body: formData,
                });
            } else {
                response = await fetch(`${BACKEND_URL}/api/check`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: text }),
                });
            }
            

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || 'Analysis failed.');
            }
            
            // For now, we just log the result. Visualization is in the next phase.
            console.log('API Response:', result);
            alert('Analysis complete! Check the browser console (F12) for results.');
            // In the next phase, we will replace the alert with result rendering.

        } catch (error) {
            showError(error.message);
        } finally {
            loadingDiv.classList.add('hidden');
        }
    });

    function showError(message) {
        errorMessageDiv.textContent = `Error: ${message}`;
        errorMessageDiv.classList.remove('hidden');
    }
});