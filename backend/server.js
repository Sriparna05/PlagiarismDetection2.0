const express = require('express');
const multer = require('multer');
const cors = require('cors');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure a directory for temporary uploads exists
const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Setup Multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Python service URL
const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://127.0.0.1:5001';

// Route to check for plagiarism
app.post('/api/check', upload.single('file'), async (req, res) => {
    const filePath = req.file ? req.file.path : null;
    try {
        let response;
        
        if (req.file) {
            const form = new FormData();
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
            return res.status(400).json({ error: 'No text or file provided.' });
        }

        res.json(response.data);

    } catch (error) {
        const errorMessage = error.response ? error.response.data.error : error.message;
        console.error('Error communicating with Python service:', errorMessage);
        res.status(500).json({ error: 'An error occurred during analysis.', details: errorMessage });
    } finally {
        // Clean up uploaded file if it exists
        if (filePath) {
            fs.unlink(filePath, (err) => {
                if (err) console.error("Error deleting temp file:", err);
            });
        }
    }
});

app.listen(port, () => {
    console.log(`Backend server listening at http://localhost:${port}`);
});