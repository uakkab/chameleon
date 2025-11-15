# Gergit - Word Ladder Puzzle Game

A word ladder puzzle game with a database backend that supports multiple valid solutions for each step.

## Features

- Database-backed word validation and puzzle storage
- Multiple valid words per step (if they achieve the goal in the same number of steps)
- Highlights the changed letter in each word
- Tracks incorrect attempts
- Persistent game state using localStorage
- Random puzzle selection

## Setup

### Prerequisites

- Node.js (v14 or higher)
- npm

### Installation

1. Install dependencies:
```bash
npm install
```

2. Initialize the database:
```bash
npm run init-db
```

This will create the SQLite database and populate it with:
- Valid 4-letter words
- Puzzle definitions
- All possible valid solutions for each puzzle step

### Running the Application

Start the server:
```bash
npm start
```

The application will be available at `http://localhost:3000`

## How It Works

### Database Schema

The application uses SQLite with three main tables:

1. **words** - Dictionary of valid words
2. **puzzles** - Puzzle definitions (start word, end word, number of moves)
3. **puzzle_solutions** - Valid words for each step of each puzzle

### Multiple Valid Solutions

Unlike traditional word ladder games that have only one correct answer per step, this implementation supports multiple valid words for each step. The database initialization script finds all possible paths from the start word to the end word and stores all valid intermediate words.

For example, for the puzzle LOVE → HATE:
- Step 1 might accept: DOVE, COVE, MOVE, etc.
- Step 2 might accept: DOTE, COTE, MOTE, etc.
- Step 3 might accept: DATE, GATE, MATE, etc.

### API Endpoints

- `GET /api/puzzle/:id?` - Get a random puzzle or specific puzzle by ID
- `GET /api/puzzles` - Get all puzzles
- `POST /api/validate` - Validate a word for a specific puzzle and step
- `GET /api/puzzle/:puzzleId/step/:step/words` - Get all valid words for a step
- `GET /api/word/:word` - Check if a word exists in the dictionary

## Game Rules

- Each row must contain exactly one valid word
- Each word must differ from the previous word by exactly one letter
- You can fill in rows in any order
- Words are automatically validated when complete
- Incorrect (but valid) words are shown in the side panel
