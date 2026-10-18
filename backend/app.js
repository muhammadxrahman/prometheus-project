const express = require('express');
const app = express();
const PORT = 3000;

// routes
app.get('/health', (req, res) => {
  res.send('Server is healthy');
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});