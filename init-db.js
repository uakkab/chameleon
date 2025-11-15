const Database = require('better-sqlite3');
const db = new Database('wordladder.db');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS words (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    word TEXT UNIQUE NOT NULL
  );

  CREATE TABLE IF NOT EXISTS puzzles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    start_word TEXT NOT NULL,
    end_word TEXT NOT NULL,
    moves INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS puzzle_solutions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    puzzle_id INTEGER NOT NULL,
    step INTEGER NOT NULL,
    word TEXT NOT NULL,
    FOREIGN KEY (puzzle_id) REFERENCES puzzles(id),
    UNIQUE(puzzle_id, step, word)
  );

  CREATE INDEX IF NOT EXISTS idx_puzzle_solutions ON puzzle_solutions(puzzle_id, step);
`);

// Valid words dictionary
const VALID_WORDS = [
    'COLD', 'WARM', 'CORD', 'WORD', 'WORM', 'CORE', 'WORE', 'WARE', 'CARE', 'TOTE', 'GALE', 'DOTE',
    'CART', 'CAST', 'CASE', 'CAGE', 'PAGE', 'PALE', 'PANE', 'PINE', 'FINE', 'HEAL', 'TEAL', 'FORE',
    'FIRE', 'FARE', 'FACE', 'PACE', 'RACE', 'RICE', 'RICH', 'RIPE', 'RIDE', 'HEAD', 'HEAR', 'TEAR',
    'FEAR', 'FEAT', 'BEAT', 'HEAT', 'LOSE', 'LORE', 'SAKE', 'SANE', 'MANE', 'ROPE', 'ROBE', 'RODE',
    'TALL', 'MOVE', 'SOFT', 'SORT', 'FORT', 'FORM', 'FIRM', 'TELL', 'FEST', 'HOVE', 'SEAL',
    'GAPE', 'FLOW', 'FLAW', 'FLAT', 'FAST',
    'HIDE', 'HIKE', 'LIKE', 'LIFE', 'LIFT', 'GIFT', 'GIRT', 'GIRL', 'GULL',
    'BULL', 'BULL', 'BALL', 'TALL', 'TALE', 'TAKE', 'MAKE', 'MADE', 'MATE',
    'MOTE', 'MORE', 'GORE', 'GONE', 'BONE', 'BORE', 'BOLD', 'GOLD', 'GILD',
    'MILD', 'MILE', 'MOLE', 'POLE', 'POLL', 'POOL', 'COOL', 'COAL', 'FOAL',
    'FOAM', 'ROAM', 'ROAD', 'TOAD', 'TOLD', 'TOLL', 'TOOL', 'FOOL', 'FOOD',
    'FORD', 'FORM', 'WORM', 'WORK', 'CORK', 'PORK', 'PORE', 'PORK', 'PORT',
    'SORT', 'SORE', 'SURE', 'SURF', 'TURF', 'TURN', 'TORN', 'CORN', 'BORN',
    'BARN', 'BARD', 'CARD', 'WARD', 'WAND', 'WANT', 'PANT', 'PINT', 'LINT',
    'LINE', 'LONE', 'LOVE', 'DOVE', 'DOLE', 'DOME', 'HOME', 'HOPE', 'ROPE',
    'ROBE', 'RODE', 'ROLE', 'ROLL', 'DOLL', 'DULL', 'DULL', 'DUNK', 'BUNK',
    'BANK', 'BANE', 'BAND', 'LAND', 'LANE', 'SANE', 'SAND', 'SAID', 'SAIL',
    'TAIL', 'FAIL', 'FALL', 'GALL', 'HALL', 'HALO', 'HALT', 'MALT', 'MALL',
    'MALL', 'CALL', 'CALM', 'BALM', 'BALD', 'BILE', 'BIKE', 'BITE', 'SITE',
    'SIRE', 'SIDE', 'TIDE', 'TIED', 'TIER', 'PIER', 'PIES', 'LIES', 'DIES',
    'DIEM', 'DIRE', 'WIRE', 'WIDE', 'WADE', 'WAVE', 'WAVY', 'NAVY', 'NAVE',
    'SAVE', 'SAGE', 'SAME', 'GAME', 'GATE', 'LATE', 'FATE', 'HATE', 'HAVE',
    'CAVE', 'GAVE', 'GAZE', 'DAZE', 'DATE', 'DARE', 'HARE', 'HARD', 'HARM'
];

// Insert words
const insertWord = db.prepare('INSERT OR IGNORE INTO words (word) VALUES (?)');
const insertMany = db.transaction((words) => {
  for (const word of words) insertWord.run(word);
});
insertMany(VALID_WORDS);

// Helper function to find all valid words that differ by one letter
function findValidNextWords(fromWord, allWords) {
    const validNext = [];
    for (const word of allWords) {
        if (word === fromWord) continue;
        let differences = 0;
        for (let i = 0; i < fromWord.length; i++) {
            if (fromWord[i] !== word[i]) differences++;
        }
        if (differences === 1) {
            validNext.push(word);
        }
    }
    return validNext;
}

// Helper function to find all valid solutions for a puzzle
function findAllSolutions(start, end, steps, allWords) {
    // Use BFS to find all paths of the given length
    const solutions = [];

    function dfs(current, path, remaining) {
        if (remaining === 0) {
            if (current === end) {
                solutions.push([...path]);
            }
            return;
        }

        const nextWords = findValidNextWords(current, allWords);
        for (const next of nextWords) {
            if (!path.includes(next)) {
                path.push(next);
                dfs(next, path, remaining - 1);
                path.pop();
            }
        }
    }

    dfs(start, [], steps + 1);
    return solutions;
}

// Define puzzles with their solutions
const puzzles = [
    { start: 'HEAD', end: 'SEAL', moves: 3 },
    { start: 'LOVE', end: 'HATE', moves: 3 },
    { start: 'COLD', end: 'WARM', moves: 3 },
    { start: 'HATE', end: 'LOVE', moves: 3 },
    { start: 'SOFT', end: 'FIRM', moves: 3 },
    { start: 'BALL', end: 'GAME', moves: 3 },
    { start: 'HIDE', end: 'FIRE', moves: 3 },
];

const insertPuzzle = db.prepare('INSERT INTO puzzles (start_word, end_word, moves) VALUES (?, ?, ?)');
const insertSolution = db.prepare('INSERT OR IGNORE INTO puzzle_solutions (puzzle_id, step, word) VALUES (?, ?, ?)');

for (const puzzle of puzzles) {
    const result = insertPuzzle.run(puzzle.start, puzzle.end, puzzle.moves);
    const puzzleId = result.lastInsertRowid;

    console.log(`\nFinding solutions for ${puzzle.start} -> ${puzzle.end} in ${puzzle.moves} steps...`);

    // Find all possible solutions
    const solutions = findAllSolutions(puzzle.start, puzzle.end, puzzle.moves, VALID_WORDS);

    console.log(`Found ${solutions.length} possible solution(s)`);

    // Insert all valid words for each step
    const validWordsPerStep = {};

    for (const solution of solutions) {
        console.log(`  Solution: ${puzzle.start} -> ${solution.join(' -> ')}`);

        for (let i = 0; i < solution.length - 1; i++) {
            const step = i + 1;
            const word = solution[i];

            if (!validWordsPerStep[step]) {
                validWordsPerStep[step] = new Set();
            }
            validWordsPerStep[step].add(word);
        }
    }

    // Insert unique valid words for each step
    for (const [step, words] of Object.entries(validWordsPerStep)) {
        for (const word of words) {
            insertSolution.run(puzzleId, step, word);
            console.log(`    Step ${step}: ${word}`);
        }
    }
}

console.log('\nDatabase initialized successfully!');
console.log(`Total words: ${db.prepare('SELECT COUNT(*) as count FROM words').get().count}`);
console.log(`Total puzzles: ${db.prepare('SELECT COUNT(*) as count FROM puzzles').get().count}`);
console.log(`Total solution words: ${db.prepare('SELECT COUNT(*) as count FROM puzzle_solutions').get().count}`);

db.close();
