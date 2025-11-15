// API base URL - adjust if running on different host/port
const API_BASE = window.location.origin;

class WordLadderGame {
    constructor() {
        this.puzzle = null;
        this.attempts = [];
        this.changedPositions = []; // Track which position changed for each row
        this.wordHistory = [];
        this.init();
    }

    async init() {
        try {
            // Load saved state first (this will set puzzle if saved)
            this.loadState();

            // Fetch puzzle from API if not loaded from saved state
            if (!this.puzzle) {
                await this.getDailyPuzzle();
            }

            // Render the board
            this.renderBoard();
            this.updateStats();
            this.updateHistory();

            // Set up event listeners
            document.getElementById('checkBtn').addEventListener('click', () => this.checkSolution());
            document.getElementById('resetBtn').addEventListener('click', () => this.reset());
        } catch (error) {
            console.error('Error initializing game:', error);
            this.showMessage('Error loading puzzle. Please refresh the page.', 'error');
        }
    }

    async getDailyPuzzle() {
        try {
            const response = await fetch(`${API_BASE}/api/puzzle`);
            if (!response.ok) {
                throw new Error('Failed to fetch puzzle');
            }
            const puzzle = await response.json();

            // Transform the puzzle format to match what we expect
            this.puzzle = {
                id: puzzle.id,
                start: puzzle.start_word,
                end: puzzle.end_word,
                moves: puzzle.moves
            };

            return this.puzzle;
        } catch (error) {
            console.error('Error fetching puzzle:', error);
            throw error;
        }
    }

    updateHistory() {
        const historyList = document.getElementById('historyList');
        historyList.innerHTML = '';

        // Only show valid words that were incorrect
        this.wordHistory.forEach(entry => {
            if (!entry.isCorrect) {
                const historyItem = document.createElement('div');
                historyItem.className = 'history-item';
                historyItem.textContent = entry.word;
                historyList.appendChild(historyItem);
            }
        });
    }

    renderBoard() {
        const board = document.getElementById('gameBoard');
        board.innerHTML = '';
        const wordLength = this.puzzle.start.length;
        const totalRows = this.puzzle.moves + 2; // +2 for START and END

        for (let i = 0; i < totalRows; i++) {
            const step = document.createElement('div');
            step.className = 'step';

            const stepNumber = document.createElement('div');
            stepNumber.className = 'step-number';

            // Set label for each row
            if (i === 0) {
                stepNumber.textContent = 'START';
                stepNumber.classList.add('start');
            } else if (i === totalRows - 1) {
                stepNumber.textContent = 'END';
                stepNumber.classList.add('end');
            } else {
                stepNumber.textContent = i;
            }

            const letterBoxes = document.createElement('div');
            letterBoxes.className = 'letter-boxes';

            // Determine if this row is editable
            const isStart = i === 0;
            const isEnd = i === totalRows - 1;
            const isEditable = !isStart && !isEnd;

            // Create individual letter boxes
            for (let j = 0; j < wordLength; j++) {
                const box = document.createElement('input');
                box.type = 'text';
                box.className = 'letter-box';
                box.maxLength = 1;
                box.id = `box${i}-${j}`;

                // Pre-fill START and END rows
                if (isStart) {
                    box.value = this.puzzle.start[j];
                    box.disabled = true;
                    box.classList.add('prefilled');
                } else if (isEnd) {
                    box.value = this.puzzle.end[j];
                    box.disabled = true;
                    box.classList.add('prefilled');
                } else {
                    // Editable rows - restore saved attempts
                    const attemptIndex = i - 1; // Subtract 1 because START is row 0
                    if (this.attempts[attemptIndex] && this.attempts[attemptIndex][j]) {
                        box.value = this.attempts[attemptIndex][j];
                        box.classList.add('filled', 'correct');
                        // Highlight the changed letter
                        if (this.changedPositions[attemptIndex] === j) {
                            box.classList.add('changed');
                        }
                        box.disabled = true;
                    }

                    // Handle input
                    box.addEventListener('input', (e) => {
                        const value = e.target.value.toUpperCase();
                        e.target.value = value;

                        if (value) {
                            e.target.classList.add('filled');
                            // Move to next box
                            if (j < wordLength - 1) {
                                document.getElementById(`box${i}-${j + 1}`).focus();
                            } else {
                                // Last letter of the word - auto-check
                                setTimeout(() => this.checkCurrentWord(i), 100);
                            }
                        }
                    });

                    // Handle backspace
                    box.addEventListener('keydown', (e) => {
                        if (e.key === 'Backspace' && !e.target.value && j > 0) {
                            // Move to previous box and clear it
                            const prevBox = document.getElementById(`box${i}-${j - 1}`);
                            prevBox.focus();
                            prevBox.value = '';
                            prevBox.classList.remove('filled');
                        }
                    });
                }

                letterBoxes.appendChild(box);
            }

            step.appendChild(stepNumber);
            step.appendChild(letterBoxes);
            board.appendChild(step);
        }

        // Focus first empty row
        for (let i = 1; i < totalRows - 1; i++) {
            if (!this.attempts[i - 1]) {
                document.getElementById(`box${i}-0`).focus();
                break;
            }
        }
    }

    async checkCurrentWord(rowIndex) {
        const wordLength = this.puzzle.start.length;
        const totalRows = this.puzzle.moves + 2;

        // Collect the word from the current row
        let word = '';
        for (let j = 0; j < wordLength; j++) {
            const box = document.getElementById(`box${rowIndex}-${j}`);
            word += box.value.toUpperCase();
        }

        // Check if word is complete
        if (word.length !== wordLength) {
            return;
        }

        // Get the step number (rowIndex - 1 because row 0 is START)
        const step = rowIndex;

        try {
            // Validate word against the API
            const response = await fetch(`${API_BASE}/api/validate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    puzzleId: this.puzzle.id,
                    step: step,
                    word: word
                })
            });

            if (!response.ok) {
                throw new Error('Validation failed');
            }

            const result = await response.json();

            // Check if it's a valid dictionary word
            if (!result.isValid) {
                // Not a valid word - don't add to history, just show error and clear
                this.showMessage('Not a valid word', 'error');

                setTimeout(() => {
                    for (let j = 0; j < wordLength; j++) {
                        const box = document.getElementById(`box${rowIndex}-${j}`);
                        box.value = '';
                        box.classList.remove('filled', 'correct', 'incorrect', 'error');
                    }
                    document.getElementById(`box${rowIndex}-0`).focus();
                    this.clearMessage();
                }, 1000);
                return;
            }

            // Word is valid - check if it's a correct answer for this step
            const isCorrect = result.isCorrect;

            // Add to history (both correct and incorrect valid words)
            this.wordHistory.push({ word: word, isCorrect: isCorrect });
            this.updateHistory();

            if (isCorrect) {
            // Correct word - mark as correct and lock it
            const attemptIndex = rowIndex - 1;
            this.attempts[attemptIndex] = word;

            // Find the previous word to compare
            let previousWord;
            if (rowIndex === 1) {
                // First editable row - compare with START word
                previousWord = this.puzzle.start;
            } else {
                // Compare with the previous correct attempt
                previousWord = this.attempts[attemptIndex - 1];
            }

            // Find which position changed
            let changedPosition = -1;
            for (let j = 0; j < wordLength; j++) {
                if (word[j] !== previousWord[j]) {
                    changedPosition = j;
                    break;
                }
            }
            this.changedPositions[attemptIndex] = changedPosition;

            for (let j = 0; j < wordLength; j++) {
                const box = document.getElementById(`box${rowIndex}-${j}`);
                box.classList.add('correct');
                // Highlight the changed letter
                if (j === changedPosition) {
                    box.classList.add('changed');
                }
                box.disabled = true;
            }

            // Move focus to next empty row (unless this is the last editable row)
            const lastEditableRow = totalRows - 2;
            if (rowIndex < lastEditableRow) {
                // Find next empty row
                for (let nextRow = rowIndex + 1; nextRow <= lastEditableRow; nextRow++) {
                    const nextAttemptIndex = nextRow - 1;
                    if (!this.attempts[nextAttemptIndex]) {
                        setTimeout(() => {
                            const firstBox = document.getElementById(`box${nextRow}-0`);
                            if (firstBox && !firstBox.disabled) {
                                firstBox.focus();
                            }
                        }, 100);
                        break;
                    }
                }
            }

            // Check if all rows are complete
            let allComplete = true;
            for (let i = 0; i < this.puzzle.moves; i++) {
                if (!this.attempts[i]) {
                    allComplete = false;
                    break;
                }
            }

            if (allComplete) {
                // Puzzle solved!
                const messageEl = document.getElementById('message');
                messageEl.className = 'message success';
                messageEl.textContent = '🎉 Congratulations! You solved the puzzle!';
                this.saveWin();
            }

            this.saveState();
        } else {
            // Valid word but incorrect position - show message and clear
            this.showMessage('Valid word, but not the correct one for this position', 'error');

            for (let j = 0; j < wordLength; j++) {
                const box = document.getElementById(`box${rowIndex}-${j}`);
                box.classList.add('incorrect');
            }

            setTimeout(() => {
                for (let j = 0; j < wordLength; j++) {
                    const box = document.getElementById(`box${rowIndex}-${j}`);
                    box.value = '';
                    box.classList.remove('filled', 'correct', 'incorrect', 'error');
                }
                document.getElementById(`box${rowIndex}-0`).focus();

                setTimeout(() => {
                    this.clearMessage();
                }, 1500);
            }, 1000);
        }
        } catch (error) {
            console.error('Error validating word:', error);
            this.showMessage('Error validating word. Please try again.', 'error');
        }
    }

    showMessage(text, type = 'info') {
        const messageEl = document.getElementById('message');
        messageEl.className = `message ${type}`;
        messageEl.textContent = text;
    }

    clearMessage() {
        const messageEl = document.getElementById('message');
        messageEl.className = 'message';
        messageEl.textContent = '';
    }

    checkSolution() {
        // Check if all rows are already complete
        let allComplete = true;
        for (let i = 0; i < this.puzzle.moves; i++) {
            if (!this.attempts[i]) {
                allComplete = false;
                break;
            }
        }

        if (allComplete) {
            this.showMessage('🎉 Congratulations! You solved the puzzle!', 'success');
        } else {
            this.showMessage('Please complete all rows with the correct words!', 'error');

            setTimeout(() => {
                this.clearMessage();
            }, 2000);
        }
    }

    isOneLetterDifferent(word1, word2) {
        if (word1.length !== word2.length) return false;

        let differences = 0;
        for (let i = 0; i < word1.length; i++) {
            if (word1[i] !== word2[i]) {
                differences++;
            }
        }

        return differences === 1;
    }

    disableInputs() {
        const wordLength = this.puzzle.start.length;
        const totalRows = this.puzzle.moves + 2;
        // Disable only editable rows (not START or END which are already disabled)
        for (let i = 1; i < totalRows - 1; i++) {
            for (let j = 0; j < wordLength; j++) {
                document.getElementById(`box${i}-${j}`).disabled = true;
            }
        }
        document.getElementById('checkBtn').disabled = true;
    }

    async reset() {
        this.attempts = [];
        this.changedPositions = [];
        this.wordHistory = [];

        // Optionally get a new puzzle
        await this.getDailyPuzzle();

        this.renderBoard();
        this.updateHistory();

        this.clearMessage();

        document.getElementById('checkBtn').disabled = false;
        this.saveState();
    }

    saveState() {
        const state = {
            date: this.getToday(),
            attempts: this.attempts,
            changedPositions: this.changedPositions,
            wordHistory: this.wordHistory,
            puzzle: this.puzzle
        };
        localStorage.setItem('wordLadderState', JSON.stringify(state));
    }

    loadState() {
        const saved = localStorage.getItem('wordLadderState');
        if (saved) {
            const state = JSON.parse(saved);
            // Only load state if it's from today
            if (state.date === this.getToday() && state.puzzle) {
                this.puzzle = state.puzzle;
                this.attempts = state.attempts || [];
                this.changedPositions = state.changedPositions || [];
                this.wordHistory = state.wordHistory || [];
            }
        }
    }

    saveWin() {
        const stats = this.getStats();
        stats.wins++;
        stats.streak++;
        stats.lastWin = this.getToday();
        localStorage.setItem('wordLadderStats', JSON.stringify(stats));
        this.updateStats();
    }

    getStats() {
        const saved = localStorage.getItem('wordLadderStats');
        if (saved) {
            const stats = JSON.parse(saved);
            if (stats.lastWin !== this.getYesterday()) {
                stats.streak = 0;
            }
            return stats;
        }
        return { wins: 0, streak: 0, lastWin: null };
    }

    updateStats() {
        const stats = this.getStats();
        const statsEl = document.getElementById('stats');
        statsEl.textContent = `Wins: ${stats.wins} | Current Streak: ${stats.streak}`;
    }

    getToday() {
        return new Date().toISOString().split('T')[0];
    }

    getYesterday() {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return yesterday.toISOString().split('T')[0];
    }
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new WordLadderGame();
});
