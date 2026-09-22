const express = require("express");
const path = require("path");

const app = express();

app.use(express.json());
app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Temporary storage (replace with a database later)
const payments = new Map();

/**
 * CREATE PAYMENT
 */
app.post("/api/pay", async (req, res) => {
  try {
    const { name, phone, amount, provider } = req.body;

    if (!phone || !amount) {
      return res.status(400).json({
        success: false,
        message: "Phone and amount are required."
      });
    }

    const providerCode =
      provider === "airtel"
        ? "airtel_money_ug"
        : "mtn_momo_ug";

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
          provider_code: providerCode,
          currency: "UGX",
          amount: Number(amount),
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
    } catch {
      data = { message: text };
    }

    console.log("OptimaPay:", response.status, data);

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        message: data.message || "Payment initialization failed."
      });
    }

    const transactionId =
      data.data?.internal_reference ||
      data.internal_reference ||
      data.reference ||
      data.data?.reference;

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

/**
 * CHECK PAYMENT STATUS
 */
app.get("/api/status/:transactionId", async (req, res) => {
  try {
    const { transactionId } = req.params;

    const response = await fetch(
      `https://gwapi.optimapay.com/collections/status/${transactionId}`,
      {
        headers: {
          "public-key": process.env.OPTIMAPAY_PUBLIC_KEY,
          "secret-key": process.env.OPTIMAPAY_SECRET_KEY,
          "x-api-version": "1"
        }
      }
    );

    const text = await response.text();

    let data = {};
    try {
      data = JSON.parse(text);
    } catch {}

    console.log("STATUS:", response.status, data);

    const status =
      data.data?.status ||
      data.status ||
      payments.get(transactionId) ||
      "PENDING";

    payments.set(transactionId, status.toUpperCase());

    res.json({
      success: true,
      status: status.toUpperCase(),
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

/**
 * WEBHOOK
 * Configure:
 * https://momo-funds-2026.onrender.com/api/webhook
 */
app.post("/api/webhook", (req, res) => {
  try {
    const secret =
      req.headers["x-webhook-secret"] ||
      req.headers["x-signature"];

    if (
      process.env.OPTIMAPAY_WEBHOOK_SECRET &&
      secret !== process.env.OPTIMAPAY_WEBHOOK_SECRET
    ) {
      return res.sendStatus(401);
    }

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

/**
 * HEALTH CHECK
 */
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "MoFunds Uganda Payment Gateway"
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
