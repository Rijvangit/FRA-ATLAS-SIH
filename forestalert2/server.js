const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 8000;

const publicDir = __dirname;

app.use(express.static(publicDir, {
  index: 'index.html',
  extensions: ['html']
}));

app.get('*', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.listen(port, () => {
  console.log(`Forest Alert server running at http://localhost:${port}`);
});
