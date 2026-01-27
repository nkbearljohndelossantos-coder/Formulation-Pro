const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// Serve static files from the root directory
// This includes your HTML, CSS, JS, and the chat-app/dist folder
app.use(express.static(__dirname));

// Fallback: If a page is not found, serve index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
    console.log(`Node.js Production Server running on port ${port}`);
});
