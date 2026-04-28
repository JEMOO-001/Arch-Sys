import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 5173;

// Serve static files from public folder
app.use(express.static(path.join(__dirname, 'public')));

// Create routes for /m1 through /m10
for (let i = 1; i <= 10; i++) {
    const route = `/m${i}`;
    const file = path.join(__dirname, 'public', 'mockups', `m${i}.html`);
    
    app.get(route, (req, res) => {
        res.sendFile(file);
    });
}

// Also serve at root for easy testing
app.get('/', (req, res) => {
    res.send(`
        <h1>Sentinel UI Mockups</h1>
        <p>Choose a design:</p>
        <ul>
            ${Array.from({length: 10}, (_, i) => 
                `<li><a href="/m${i+1}">Model ${i+1}</a></li>`
            ).join('')}
        </ul>
    `);
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log('UI Models:');
    for (let i = 1; i <= 10; i++) {
        console.log(`  http://localhost:${PORT}/m${i}`);
    }
});
