import crypto from "crypto";
import axios from "axios";
import db from "../database/db.js";

// ─────────────────────────────────────────────
// POST /api/wallet/fund
// Initiates a Flutterwave payment and records a pending transaction
// ─────────────────────────────────────────────
export const fundWallet = async (req, res) => {
  try {
    const { amount, currency } = req.body;
    const user_id = req.user.user_id;
    const email = req.user.email;

    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    const txRef = `VAN-${crypto.randomUUID()}`;

    // Save pending transaction to DB first
    await db("transactions").insert({
      transaction_id: crypto.randomUUID(),
      user_id,
      tx_ref: txRef,
      amount: Number(amount),
      status: "pending",
      type: "deposit",
      provider: "flutterwave",
      processed: false,
    });

    // Initialize Flutterwave payment
    // Initialize Flutterwave payment
    const flwResponse = await axios.post(
      "https://api.flutterwave.com/v3/payments",
      {
        tx_ref: txRef,
        amount: Number(amount),
        currency: currency || "NGN", 
        payment_options: "card, banktransfer, ussd", 
        redirect_url: `${process.env.APP_URL}/dashboard`, // Ensure this is a full URL in production
        customer: {
          email: email,
          name: req.user.name || "Vandrex Customer", 
          phonenumber: req.user.phone || "00000000000" 
        },
        meta: { 
          user_id: user_id 
        },
        customizations: {
          title: "Vandrex", // Keep it short and punchy
          description: "Wallet Funding",
          // ADD YOUR LOGO URL HERE:
          logo: "https://vandrex.vercel.app/vandrex-logo.png", 
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.FLW_SECRET}`,
          "Content-Type": "application/json",
        },
      }
    );

    return res.status(200).json({
      message: "Payment initialized",
      payment_link: flwResponse.data.data.link,
      tx_ref: txRef,
    });
  } catch (err) {
    console.error("fundWallet error:", err?.response?.data || err.message);
    return res.status(500).json({ error: "Could not initialize payment" });
  }
};

// ─────────────────────────────────────────────
// GET /api/wallet/balance
// Returns the authenticated user's wallet
// ─────────────────────────────────────────────
export const getWallet = async (req, res) => {
  try {
    const user_id = req.user.user_id;

    const wallet = await db("wallets").where({ user_id }).first();

    if (!wallet) {
      return res.status(404).json({ error: "Wallet not found" });
    }

    return res.status(200).json({ wallet });
  } catch (err) {
    console.error("getWallet error:", err.message);
    return res.status(500).json({ error: "Could not fetch wallet" });
  }
};

// ─────────────────────────────────────────────
// GET /api/wallet/transactions
// Returns paginated transactions for the authenticated user
// ─────────────────────────────────────────────
export const getTransactions = async (req, res) => {
  try {
    const user_id = req.user.user_id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const transactions = await db("transactions")
      .where({ user_id })
      .orderBy("created_at", "desc")
      .limit(limit)
      .offset(offset)
      .select(
        "transaction_id",
        "tx_ref",
        "amount",
        "currency",
        "status",
        "type",
        "created_at"
      );

    const total = await db("transactions")
      .where({ user_id })
      .count("transaction_id as count")
      .first();

    return res.status(200).json({
      transactions,
      pagination: {
        page,
        limit,
        total: Number(total.count),
        pages: Math.ceil(Number(total.count) / limit),
      },
    });
  } catch (err) {
    console.error("getTransactions error:", err.message);
    return res.status(500).json({ error: "Could not fetch transactions" });
  }
};