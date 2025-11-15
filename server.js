const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Database connection
const db = new Database('wordladder.db');

// API Routes

// Get a random puzzle or a specific puzzle by ID
app.get('/api/puzzle/:id?', (req, res) => {
    try {
        let puzzle;

        if (req.params.id) {
            puzzle = db.prepare('SELECT * FROM puzzles WHERE id = ?').get(req.params.id);
        } else {
            // Get random puzzle
            puzzle = db.prepare('SELECT * FROM puzzles ORDER BY RANDOM() LIMIT 1').get();
        }

        if (!puzzle) {
            return res.status(404).json({ error: 'Puzzle not found' });
        }

        res.json(puzzle);
    } catch (error) {
        console.error('Error fetching puzzle:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get all puzzles
app.get('/api/puzzles', (req, res) => {
    try {
        const puzzles = db.prepare('SELECT * FROM puzzles').all();
        res.json(puzzles);
    } catch (error) {
        console.error('Error fetching puzzles:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Validate a word for a specific puzzle and step
app.post('/api/validate', (req, res) => {
    try {
        const { puzzleId, step, word } = req.body;

        if (!puzzleId || !step || !word) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Check if word is valid for this puzzle and step
        const validWord = db.prepare(`
            SELECT word FROM puzzle_solutions
            WHERE puzzle_id = ? AND step = ? AND word = ?
        `).get(puzzleId, step, word.toUpperCase());

        // Also check if it's a valid dictionary word
        const isValidWord = db.prepare('SELECT word FROM words WHERE word = ?').get(word.toUpperCase());

        res.json({
            isValid: !!isValidWord,
            isCorrect: !!validWord,
            word: word.toUpperCase()
        });
    } catch (error) {
        console.error('Error validating word:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get all valid words for a specific puzzle and step
app.get('/api/puzzle/:puzzleId/step/:step/words', (req, res) => {
    try {
        const { puzzleId, step } = req.params;

        const words = db.prepare(`
            SELECT word FROM puzzle_solutions
            WHERE puzzle_id = ? AND step = ?
            ORDER BY word
        `).all(puzzleId, step);

        res.json(words.map(w => w.word));
    } catch (error) {
        console.error('Error fetching valid words:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Check if word is in dictionary
app.get('/api/word/:word', (req, res) => {
    try {
        const { word } = req.params;
        const validWord = db.prepare('SELECT word FROM words WHERE word = ?').get(word.toUpperCase());

        res.json({
            exists: !!validWord,
            word: word.toUpperCase()
        });
    } catch (error) {
        console.error('Error checking word:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Serve the index.html for the root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`API available at http://localhost:${PORT}/api`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    db.close();
    process.exit();
});
