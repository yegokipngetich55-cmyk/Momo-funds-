const express = require("express");
const path = require("path");

const app = express();

app.use(express.json());
app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Temporary payment storage (replace with a database later)
const payments = new Map();

/*
 * CREATE PAYMENT
 */
app.post("/api/pay", async (req, res) => {
  try {
    const { phone, amount } = req.body;

    if (!phone || !amount) {
      return res.status(400).json({
        success: false,
        message: "Phone and amount are required."
      });
    }

    const clientReference = `MF-${Date.now()}`;

    const response = await fetch(
      `${process.env.OPTIMAPAY_BASE_URL}/collecto/initiate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-API-KEY": process.env.OPTIMAPAY_API_KEY,
          "X-API-SECRET": process.env.OPTIMAPAY_SECRET_KEY
        },
        body: JSON.stringify({
          phone,
          amount: Number(amount),
          reference: clientReference,
          description: "MoFunds Uganda Application Fee",
          callback_url: process.env.CALLBACK_URL
        })
      }
    );

    const text = await response.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }

    console.log("INITIATE:", response.status, data);

    if (!response.ok || !data.success) {
      return res.status(response.status).json({
        success: false,
        message: data.message || JSON.stringify(data)
      });
    }

    const transactionReference = data.data.reference;

    payments.set(transactionReference, "PENDING");

    res.json({
      success: true,
      transactionId: transactionReference,
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

/*
 * CHECK PAYMENT STATUS
 */
app.get("/api/status/:transactionId", async (req, res) => {
  try {
    const response = await fetch(
      `${process.env.OPTIMAPAY_BASE_URL}/collecto/status/${req.params.transactionId}`,
      {
        headers: {
          "Accept": "application/json",
          "X-API-KEY": process.env.OPTIMAPAY_PUBLIC_KEY,
          "X-API-SECRET": process.env.OPTIMAPAY_SECRET_KEY
        }
      }
    );

    const text = await response.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = {};
    }

    console.log("STATUS:", response.status, data);

    const status =
      data.data?.status ||
      payments.get(req.params.transactionId) ||
      "PENDING";

    payments.set(req.params.transactionId, status);

    res.json({
      success: true,
      status,
      data
    });

  } catch (err) {
    console.error("STATUS ERROR:", err);

    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

/*
 * WEBHOOK
 */
app.post("/api/webhook", (req, res) => {
  try {
    console.log("WEBHOOK:", req.body);

    const { reference, status } = req.body;

    if (reference && status) {
      payments.set(reference, status.toUpperCase());
    }

    res.sendStatus(200);

  } catch (err) {
    console.error("WEBHOOK ERROR:", err);
    res.sendStatus(500);
  }
});

/*
 * HEALTH CHECK
 */
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "MoFunds Uganda Global Wallet API"
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
