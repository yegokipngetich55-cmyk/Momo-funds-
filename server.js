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
    try { data = JSON.parse(text); } catch {}

    res.status(response.status).json({
      success: response.ok,
      ...data
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});
