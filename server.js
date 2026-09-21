const express = require("express");
const path = require("path");

const app = express();

app.use(express.json());
app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Temporary in-memory store (replace with a database in production)
const payments = new Map();

app.post("/api/pay", async (req, res) => {
  try {
    const { name, phone, amount } = req.body;

    if (!phone || !amount) {
      return res.status(400).json({
        success: false,
        message: "Phone and amount are required."
      });
    }

    const response = await fetch(
      "https://gwapi.optimapay.com/collections/initialize",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "public-key": process.env.OPTIMAPAY_PUBLIC_KEY,
          "secret-key": process.env.OPTIMAPAY_SECRET_KEY,
          "x-api-version": "1"
        },
        body: JSON.stringify({
          merchant_reference: `MF-${Date.now()}`,
          transaction_method: "MOBILE_MONEY",
          provider_code: "mtn_momo_ug",
          currency: "UGX",
          amount,
          msisdn: phone,
          customer_name: name || "Customer",
          description: "MoFunds Uganda Application Fee",
          require_confirmation: false
        })
      }
    );

    const text = await response.text();

    let data = {};
    try {
      data = JSON.parse(text);
    } catch {}

    console.log("OptimaPay:", response.status, data || text);

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        message: data.message || text
      });
    }

    const transactionId =
      data.data?.internal_reference ||
      data.internal_reference ||
      data.reference;

    if (transactionId) {
      payments.set(transactionId, "PENDING");
    }

    res.json({
      success: true,
      transactionId,
      data
    });

  } catch (err) {
    console.error("PAY ERROR:", err);

    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

// Frontend polls this endpoint
app.get("/api/status/:transactionId", async (req, res) => {
  const { transactionId } = req.params;

  const status = payments.get(transactionId) || "PENDING";

  res.json({
    success: true,
    status
  });
});

// Webhook (configure this URL in OptimaPay if supported)
app.post("/api/webhook", (req, res) => {
  try {
    console.log("WEBHOOK:", req.body);

    const ref =
      req.body.internal_reference ||
      req.body.reference ||
      req.body.transaction_reference;

    const status =
      req.body.status ||
      req.body.payment_status;

    if (ref && status) {
      payments.set(ref, status.toUpperCase());
    }

    res.sendStatus(200);

  } catch (err) {
    console.error("WEBHOOK ERROR:", err);
    res.sendStatus(500);
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
