document.addEventListener('DOMContentLoaded', () => {
    // This must point to your Node.js server on Render.
    const BACKEND_URL = 'https://plagiarismdetection2-0.onrender.com'; 
    
    // ... all other code is correct and remains the same
    
    // --- Element Selectors ---
    const textInput = document.getElementById('textInput');
    const fileInput = document.getElementById('fileInput');
    const fileNameSpan = document.getElementById('fileName');
    const checkButton = document.getElementById('checkButton');
    const resetButton = document.getElementById('resetButton');
    const mainCheckerCard = document.querySelector('.checker-card');
    
    const loadingState = document.getElementById('loading');
    const resultsSection = document.getElementById('resultsSection');
    const errorMessageDiv = document.getElementById('errorMessage');
    
    const highlightedTextContainer = document.getElementById('highlightedText');
    const detailsContent = document.getElementById('detailsContent');
    
    let plagiarismChart = null;

    // --- Event Listeners ---
    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            fileNameSpan.textContent = fileInput.files[0].name;
            textInput.disabled = true;
            textInput.placeholder = 'File selected. Clear selection to use text input.';
            textInput.value = '';
        }
    });

    checkButton.addEventListener('click', handleAnalysis);
    resetButton.addEventListener('click', resetUI);

    // --- Functions ---
    async function handleAnalysis() {
        const text = textInput.value;
        const file = fileInput.files[0];

        if (!text.trim() && !file) {
            showError("Please paste text or upload a file to analyze.");
            return;
        }

        showLoading();

        try {
            let response;
            // This fetch call correctly points to the /api/check route on your Node.js server
            if (file) {
                const formData = new FormData();
                formData.append('file', file);
                response = await fetch(`${BACKEND_URL}/api/check`, { method: 'POST', body: formData });
            } else {
                response = await fetch(`${BACKEND_URL}/api/check`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: text }),
                });
            }

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || 'An unknown error occurred during analysis.');
            }
            
            displayResults(result);

        } catch (error) {
            showError(error.message);
            resetUI();
        }
    }

    function showLoading() {
        mainCheckerCard.classList.add('hidden');
        resultsSection.classList.add('hidden');
        errorMessageDiv.classList.add('hidden');
        loadingState.classList.remove('hidden');
    }

    function displayResults(data) {
        loadingState.classList.add('hidden');
        resultsSection.classList.remove('hidden');
        
        renderChart(data.plagiarism_percentage, data.unique_percentage);
        renderHighlightedText(data.original_text, data.details);
        renderDetailedBreakdown(data.details);
    }

    function renderChart(plagiarized, unique) {
        const ctx = document.getElementById('plagiarismChart').getContext('2d');
        if (plagiarismChart) {
            plagiarismChart.destroy();
        }
        plagiarismChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Plagiarized', 'Unique'],
                datasets: [{
                    data: [plagiarized, unique],
                    backgroundColor: ['#ef4444', '#10b981'],
                    borderColor: '#ffffff',
                    borderWidth: 4,
                    hoverOffset: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                cutout: '70%',
                plugins: {
                    legend: { position: 'bottom', labels: { font: { size: 14 } } },
                    title: { display: false }
                }
            }
        });
    }

    function renderHighlightedText(originalText, details) {
        // Correcting the HTML escaping.
        const escapedText = originalText.replace(/</g, "<").replace(/>/g, ">");
        
        let highlightedHtml = escapedText;
        if (details && details.length > 0) {
            const plagiarizedSentences = new Set(details.map(d => d.user_sentence));
            plagiarizedSentences.forEach(sentence => {
                const escapedSentence = sentence.replace(/</g, "<").replace(/>/g, ">");
                const regex = new RegExp(escapeRegExp(escapedSentence), 'g');
                highlightedHtml = highlightedHtml.replace(regex, `<span class="plagiarized">${escapedSentence}</span>`);
            });
        }

        highlightedTextContainer.innerHTML = highlightedHtml;
    }

    function renderDetailedBreakdown(details) {
        detailsContent.innerHTML = '';
        if (!details || details.length === 0) {
            detailsContent.innerHTML = '<p>No potential plagiarism was detected in this document.</p>';
        } else {
            details.forEach(item => {
                const detailItem = document.createElement('div');
                detailItem.className = 'detail-item';
                detailItem.innerHTML = `
                    <p class="user-sentence">"${item.user_sentence}"</p>
                    <p class="source-info">
                        <strong>Similarity Score:</strong> <span class="similarity-score">${item.similarity}%</span>
                    </p>
                    <p><strong>Potential Source:</strong> ${item.source}</p>
                    <p><strong>Matched Text:</strong> ${item.matched_sentence}</p>
                `;
                detailsContent.appendChild(detailItem);
            });
        }
    }

    function resetUI() {
        mainCheckerCard.classList.remove('hidden');
        resultsSection.classList.add('hidden');
        loadingState.classList.add('hidden');
        errorMessageDiv.classList.add('hidden');
        
        textInput.value = '';
        fileInput.value = '';
        fileNameSpan.textContent = '';
        textInput.disabled = false;
        textInput.placeholder = 'Paste your text here to check for plagiarism...';
    }

    function showError(message) {
        errorMessageDiv.textContent = `⚠️ Error: ${message}`;
        errorMessageDiv.classList.remove('hidden');
        loadingState.classList.add('hidden');
    }

    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
});