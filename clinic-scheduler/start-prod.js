// start-prod.js
const path = require("path");
const serve = require("serve");
const open = require("open");

// __dirname is available in CommonJS context
const distPath = path.join(__dirname, "dist");
const PORT = 3000;

const server = serve(distPath, {
  port: PORT,
  single: true,
  silent: true,
});

console.log(`Application is running at http://localhost:${PORT}`);
open(`http://localhost:${PORT}`);
