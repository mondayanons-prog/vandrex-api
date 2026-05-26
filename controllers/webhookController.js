import axios from "axios";
import db from "../database/db.js";

// ─────────────────────────────────────────────
// POST /api/webhook/flutterwave
// Called by Flutterwave when payment status changes
// ─────────────────────────────────────────────
export const flutterwaveWebhook = async (req, res) => {
  try {
    // ── STEP 1: Verify webhook signature ──────────────────────────
    const secretHash = process.env.FLW_SECRET_HASH;
    const incomingHash = req.headers["verif-hash"];
    console.log(
      `Debug Webhook - Expected: '${secretHash}', Received: '${incomingHash}'`,
    );

    if (!incomingHash || incomingHash !== secretHash) {
      console.warn("Webhook rejected: invalid signature");
      return res.status(401).end();
    }

    // Parse raw body (express.raw used in app.js for this route)
    const payload = JSON.parse(req.body.toString());

    // ── STEP 2: Only handle charge completion events ───────────────
    if (payload.event !== "charge.completed") {
      return res.status(200).end(); // ignore other events silently
    }

    const txRef = payload?.data?.tx_ref;
    const flwRef = payload?.data?.flw_ref;

    if (!txRef) {
      return res.status(400).end();
    }

    // ── STEP 3: Log raw webhook payload for audit ──────────────────
    await db("payment_logs").insert({
      tx_ref: txRef,
      event_type: payload.event,
      payload: JSON.stringify(payload),
    });

    // ── STEP 4: Find transaction in DB ────────────────────────────
    const tx = await db("transactions").where({ tx_ref: txRef }).first();

    if (!tx) {
      console.warn(`Webhook: no transaction found for tx_ref=${txRef}`);
      return res.status(404).end();
    }

    // ── STEP 5: Idempotency check — do not double-credit ──────────
    if (tx.processed === true || tx.status === "successful") {
      console.log(`Webhook: tx_ref=${txRef} already processed, skipping`);
      return res.status(200).end();
    }

    // ── STEP 6: Verify transaction with Flutterwave API ───────────
    const verifyResponse = await axios.get(
      `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${txRef}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.FLW_SECRET}`,
        },
      },
    );

    const verifiedData = verifyResponse.data?.data;

    // ── STEP 7: Validate amount and currency match ─────────────────
    const amountMatches = Number(verifiedData.amount) === Number(tx.amount);
    const currencyMatches = verifiedData.currency === tx.currency;

    if (!amountMatches || !currencyMatches) {
      console.error(
        `Webhook: amount/currency mismatch for tx_ref=${txRef}. ` +
          `Expected ${tx.amount} ${tx.currency}, got ${verifiedData.amount} ${verifiedData.currency}`,
      );
      await db("transactions")
        .where({ tx_ref: txRef })
        .update({ status: "failed" });

      return res.status(200).end();
    }

    // ── STEP 8: Handle payment outcome ────────────────────────────
    if (verifiedData.status !== "successful") {
      await db("transactions")
        .where({ tx_ref: txRef })
        .update({
          status: verifiedData.status === "failed" ? "failed" : "pending",
          flw_ref: flwRef || null,
        });

      return res.status(200).end();
    }

    // ── STEP 9: Credit wallet atomically + mark tx processed ──────
    // Using a Knex transaction to ensure both updates succeed or both roll back
    // ── STEP 9: Credit wallet atomically + mark tx processed ──────
    await db.transaction(async (trx) => {
      // 1. Check if the user already has a wallet
      const wallet = await trx("wallets").where({ user_id: tx.user_id }).first();

      if (wallet) {
        // 2a. Wallet exists -> Update balance
        await trx("wallets")
          .where({ user_id: tx.user_id })
          .update({ 
             balance: Number(wallet.balance) + Number(tx.amount),
             updated_at: new Date() // Force timestamp update on modification
          });
      } else {
        // 2b. Wallet DOES NOT exist -> Create it 
        await trx("wallets").insert({
          user_id: tx.user_id,
          currency: tx.currency,
          balance: Number(tx.amount)
          // Look how clean this is! 
          // wallet_id automatically gets gen_random_uuid()
          // updated_at automatically gets NOW()
        });
      }

      // 3. Mark transaction as successful
      await trx("transactions").where({ tx_ref: txRef }).update({
        status: "successful",
        flw_ref: flwRef || null,
        processed: true,
      });
    });

    console.log(
      `Wallet credited: user=${tx.user_id}, amount=${tx.amount}, tx_ref=${txRef}`,
    );

    return res.status(200).end();
  } catch (err) {
    console.error(
      "flutterwaveWebhook error:",
      err?.response?.data || err.message,
    );
    return res.status(500).end();
  }
};
