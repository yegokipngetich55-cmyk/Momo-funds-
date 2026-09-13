const express = require("express");
const path = require("path");

const app = express();
app.use(express.json());

// Serve your HTML files
app.use(express.static(__dirname));

// Show index.html at the homepage
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Payment API
app.post("/api/pay", async (req, res) => {
  // Keep your existing OptimaPay code here
});

app.get("/api/status/:transactionId", (req, res) => {
  res.json({ success: true, status: "PENDING" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
