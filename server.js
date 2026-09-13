const express = require("express");

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.send("MoFunds OptimaPay Backend is running.");
});

app.post("/api/pay", async (req, res) => {
  try {
    const response = await fetch("https://global.optimapaybridge.co.ke/V2/charge", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPTIMAPAY_SECRET_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        amount: req.body.amount,
        currency: "UGX",
        payout_channel: "MTN_MOMO",
        phone: req.body.phone
      })
    });

    const text = await response.text();
    console.log("OptimaPay:", response.status, text);

    let data = {};
    try {
      data = JSON.parse(text);
    } catch {}

    res.status(response.status).json({
      success: response.ok,
      ...data
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
  res.json({
    success: true,
    status: "PENDING"
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
