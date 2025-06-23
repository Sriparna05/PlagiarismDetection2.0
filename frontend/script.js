document.addEventListener('DOMContentLoaded', () => {
    const BACKEND_URL = 'http://localhost:3000';
    const form = document.getElementById('plagiarismForm');
    const textInput = document.getElementById('textInput');
    const fileInput = document.getElementById('fileInput');
    const resultsSection = document.getElementById('resultsSection');
    const detailsContainer = document.getElementById('detailsContainer');
    const highlightedTextContainer = document.getElementById('highlightedText');
    const loadingDiv = document.getElementById('loading');
    const errorMessageDiv = document.getElementById('errorMessage');

    const corpusFileInput = document.getElementById('corpusFileInput');
    const addCorpusBtn = document.getElementById('addCorpusBtn');
    const corpusMessage = document.getElementById('corpusMessage');
    
    let plagiarismChart = null; // To hold the chart instance

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
            if (!response.ok) throw new Error(result.error || 'Failed to add document.');
            corpusMessage.textContent = result.message;
            corpusMessage.className = 'message success';
            corpusFileInput.value = '';
        } catch (error) {
            corpusMessage.textContent = `Error: ${error.message}`;
            corpusMessage.className = 'message error';
        }
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const text = textInput.value;
        const file = fileInput.files[0];
        if (!text.trim() && !file) {
            alert('Please provide text or upload a file.');
            return;
        }

        loadingDiv.classList.remove('hidden');
        resultsSection.classList.add('hidden');
        errorMessageDiv.classList.add('hidden');

        try {
            let response;
            if (file) {
                const formData = new FormData();
                formData.append('file', file);
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
            if (!response.ok) throw new Error(result.error || 'Analysis failed.');
            
            displayResults(result);

        } catch (error) {
            showError(error.message);
        } finally {
            loadingDiv.classList.add('hidden');
        }
    });

    function displayResults(data) {
        resultsSection.classList.remove('hidden');
        
        renderChart(data.plagiarism_percentage, data.unique_percentage);
        renderHighlightedText(data.original_text, data.details);
        renderDetailedBreakdown(data.details);
        
        if (data.message) {
             const warningDiv = document.createElement('div');
             warningDiv.className = 'message'; // Style as a general message or new warning class
             warningDiv.textContent = data.message;
             detailsContainer.prepend(warningDiv);
        }
    }
    
    function renderHighlightedText(originalText, details) {
        const plagiarizedSentences = new Set(details.map(d => d.user_sentence));
        
        // Escape HTML to prevent XSS
        const escapedText = originalText.replace(/</g, "<").replace(/>/g, ">");
        
        let highlightedHtml = escapedText;
        plagiarizedSentences.forEach(sentence => {
            const escapedSentence = sentence.replace(/</g, "<").replace(/>/g, ">");
            const regex = new RegExp(escapeRegExp(escapedSentence), 'g');
            highlightedHtml = highlightedHtml.replace(regex, `<span class="plagiarized">${escapedSentence}</span>`);
        });

        highlightedTextContainer.innerHTML = highlightedHtml;
    }
    
    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
    }

    function renderDetailedBreakdown(details) {
        detailsContainer.innerHTML = ''; // Clear previous results
        if (details.length === 0) {
            detailsContainer.innerHTML = '<p>No potential plagiarism detected.</p>';
        } else {
            details.forEach(item => {
                const detailItem = document.createElement('div');
                detailItem.className = 'detail-item';
                detailItem.innerHTML = `
                    <p class="user-sentence">"<em>${item.user_sentence}</em>"</p>
                    <p class="source-info">
                        Potential match found in <strong>${item.source}</strong> with 
                        <span class="similarity-score">${item.similarity}% similarity.</span>
                    </p>
                    <p><strong>Matched Sentence:</strong> ${item.matched_sentence}</p>
                `;
                detailsContainer.appendChild(detailItem);
            });
        }
    }

    function renderChart(plagiarized, unique) {
        const ctx = document.getElementById('plagiarismChart').getContext('2d');
        if (plagiarismChart) {
            plagiarismChart.destroy();
        }
        plagiarismChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['Plagiarized', 'Unique'],
                datasets: [{
                    data: [plagiarized, unique],
                    backgroundColor: ['#ff4b5c', '#00c896'],
                    borderColor: '#ffffff',
                    borderWidth: 2,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top' },
                    title: { display: true, text: 'Plagiarism Analysis' }
                }
            }
        });
    }

    function showError(message) {
        errorMessageDiv.textContent = `Error: ${message}`;
        errorMessageDiv.classList.remove('hidden');
    }
});