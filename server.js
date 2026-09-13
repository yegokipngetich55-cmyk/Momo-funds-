const express = require("express");
const fetch = require("node-fetch");

const app = express();
app.use(express.json());

app.post("/api/pay", async (req, res) => {

    const response = await fetch("https://api.optimapay.io/v1/payments", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${process.env.OPTIMAPAY_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            amount: req.body.amount,
            currency: "UGX",
            channel: req.body.channel,
            phone: req.body.phone
        })
    });

    const data = await response.json();
    res.json({
        message: "Payment request sent.",
        data
    });
});

app.listen(process.env.PORT || 3000);
