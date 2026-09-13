const express = require("express");

const app = express();
app.use(express.json());

const BASE_URL = "https://api.optimapay.io/v1";

app.get("/", (req, res) => {
  res.send("MoFunds OptimaPay Backend is running.");
});

app.post("/api/pay", async (req, res) => {
  try {
    const response = await fetch(`${BASE_URL}/payments`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPTIMAPAY_SECRET_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        amount: req.body.amount,
        currency: "UGX",
        channel: "mtn_momo",
        phone: req.body.phone
      })
    });

    const text = await response.text();
    console.log("OptimaPay response:", response.status, text);

    let data = {};
    try { data = JSON.parse(text); } catch {}

    res.status(response.status).json({
      success: response.ok,
      ...data,
      message: data.message || text
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

app.get("/api/status/:transactionId", (req, res) => {
  res.json({ success: true, status: "PENDING" });
});

app.listen(process.env.PORT || 3000);
