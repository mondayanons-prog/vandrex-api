import express from "express";
import {
  fundWallet,
  getWallet,
  getTransactions,
} from "../controllers/walletController.js";
import jwtAuth from "../middlewares/jwt.js";
// import { protect } from "../middlewares/authMiddleware.js";

const walletRoute = express.Router();
const isAuthenticated = jwtAuth.isAuthenticated;

walletRoute.post("/fund", isAuthenticated, fundWallet);
walletRoute.get("/balance", isAuthenticated, getWallet);
walletRoute.get("/transactions", isAuthenticated, getTransactions);

export default walletRoute;
