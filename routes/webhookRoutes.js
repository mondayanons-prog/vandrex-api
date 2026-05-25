import express from "express";
import { flutterwaveWebhook } from "../controllers/webhookController.js";

const webhookRoute = express.Router();

webhookRoute.post("/flutterwave", flutterwaveWebhook);

export default webhookRoute;