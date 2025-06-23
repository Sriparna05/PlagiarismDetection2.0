const express = require('express');
const multer = require('multer');
const cors = require('cors');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Setup Multer for file uploads in a temporary directory
const upload = multer({ dest: 'uploads/' });

// Python service URL (make sure your Python service is running on this address)
const PYTHON_SERVICE_URL = 'http://127.0.0.1:5001';

// Route to add a document to the corpus
app.post('/api/add-document', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send({ error: 'No file uploaded.' });
    }

    const filePath = req.file.path;
    try {
        const form = new FormData();
        form.append('file', fs.createReadStream(filePath), req.file.originalname);

        const response = await axios.post(`${PYTHON_SERVICE_URL}/add-document`, form, {
            headers: { ...form.getHeaders() }
        });
        
        fs.unlinkSync(filePath); // Clean up uploaded file
        res.status(200).json(response.data);
    } catch (error) {
        fs.unlinkSync(filePath); // Clean up on error too
        console.error("Error forwarding to Python service:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: "Failed to communicate with the AI service." });
    }
});


// Route to check for plagiarism
app.post('/api/check', upload.single('file'), async (req, res) => {
    const filePath = req.file ? req.file.path : null;
    try {
        let response;
        const form = new FormData();

        if (req.file) {
            form.append('file', fs.createReadStream(filePath), req.file.originalname);
            response = await axios.post(`${PYTHON_SERVICE_URL}/analyze`, form, {
                headers: { ...form.getHeaders() }
            });
        } else if (req.body.text) {
            response = await axios.post(`${PYTHON_SERVICE_URL}/analyze`, {
                text: req.body.text
            }, {
                headers: { 'Content-Type': 'application/json' }
            });
        } else {
            return res.status(400).send({ error: 'No text or file provided.' });
        }

        res.json(response.data);

    } catch (error) {
        console.error('Error communicating with Python service:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'An error occurred during analysis.' });
    } finally {
        // Clean up uploaded file if it exists
        if (filePath) {
            fs.unlinkSync(filePath);
        }
    }
});

app.listen(port, () => {
    console.log(`Backend server listening at http://localhost:${port}`);
});