const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const port = 5001;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(cors({
    origin: 'http://localhost:3000'
}));

// Setup PostgreSQL connection
const pool = new Pool({
    user: process.env.POSTGRES_USER,
    host: process.env.POSTGRES_HOST,
    database: process.env.POSTGRES_DATABASE,
    password: process.env.POSTGRES_PASSWORD,
    port: 5432,
    connectionString: process.env.POSTGRES_URL,
});

// Verify database connection
pool.connect((err, client, done) => {
    if (err) {
        console.error('Failed to connect to the database:', err);
    } else {
        console.log('Connected to the database');
        done();
    }
});

// Setup Multer storage for EPUB files
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'uploads', 'epubs');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const tokenId = req.params.tokenId; // Get tokenId from URL params
        if (!tokenId) {
            console.error("No tokenId provided in the request");
            return cb(new Error("No tokenId provided"));
        }
        const ext = path.extname(file.originalname);
        cb(null, `${tokenId}${ext}`); // Save the file as <tokenId>.epub
    }
});

const upload = multer({ storage });

// Endpoint to upload EPUB files
app.post('/upload-epub/:tokenId', upload.single('epub'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }
    res.send({
        message: 'File uploaded successfully',
        filePath: `/uploads/epubs/${req.file.filename}`
    });
});

// Serve EPUB files from the uploads/epubs directory
app.use('/epubs', express.static(path.join(__dirname, 'uploads', 'epubs')));

// Endpoint to save item data to the database
app.post('/api/items', async (req, res) => {
    const { token_id, price, recipient, royaltyRecipient, royaltyValue, metadataUri, timestamp } = req.body;
    try {
        // Validate inputs, but allow royaltyValue to be 0
        if (!token_id || !price || !recipient || !royaltyRecipient || metadataUri === undefined || !timestamp) {
            return res.status(400).json({ error: 'Invalid input data' });
        }

        // Ensure royaltyValue is a number, including 0
        const parsedRoyaltyValue = parseInt(royaltyValue);
        if (isNaN(parsedRoyaltyValue)) {
            return res.status(400).json({ error: 'Royalty value must be a number' });
        }

        // Save item to the database
        const result = await pool.query(
            'INSERT INTO items (token_id, price, recipient, royalty_recipient, royalty, metadata_uri, timestamp) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [token_id, price, recipient, royaltyRecipient, parsedRoyaltyValue, metadataUri, timestamp]
        );
        res.json(result.rows[0]);
    } catch (error) {
        console.error("Error inserting item:", error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Endpoint to delete an item by token_id
app.delete('/api/items/:tokenId', async (req, res) => {
    const { tokenId } = req.params;
    try {
        const result = await pool.query('DELETE FROM items WHERE token_id = $1 RETURNING *', [tokenId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Item not found' });
        }
        res.json({ message: 'Item deleted successfully', item: result.rows[0] });
    } catch (error) {
        console.error("Error deleting item:", error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Endpoint to fetch items by recipient
app.get('/api/items/:recipient', async (req, res) => {
    const { recipient } = req.params;
    try {
        const result = await pool.query(
            'SELECT * FROM items WHERE LOWER(recipient) = LOWER($1)',
            [recipient]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'No items found for the given recipient' });
        }
        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching items:", error);
        res.status(500).json({ error: 'Database error' });
    }
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});