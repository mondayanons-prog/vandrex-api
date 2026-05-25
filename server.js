import "dotenv/config";
import express from "express";
import cors from "cors";
import routes from "./routes/routes.js";
import jwtAuthentification from "./middlewares/jwt.js";
import cookieParser from "cookie-parser";
import jwtAuth from "./middlewares/jwt.js";
import walletRoutes from "./routes/walletRoutes.js";
import webhookRoutes from "./routes/webhookRoutes.js";
// import multer from "multer";

const app = express();


// Webhook route MUST use raw body — register BEFORE json middleware
app.use("/api/webhook", express.raw({ type: "application/json" }), webhookRoutes);


const corsOptions = {
  credentials: true,
  origin: [
    "http://localhost:3000",
    "https://localhost:3000",
    "https://vandrex.vercel.app",
  ],
};
app.use(cors(corsOptions));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

app.set("trust proxy", 1);

app.use(jwtAuth.normalAuthWithCookie);

const isAuthenticated = jwtAuth.isAuthenticated;

app.use("/api", routes);
app.use("/api/wallet", walletRoutes);
// app.use((err, req, res, next) => {
//   if (err instanceof multer.MulterError) {
//     if (err.code === "LIMIT_FILE_SIZE") {
//       return res
//         .status(400)
//         .json({ error: "File too large. Max 100MB limit." });
//     }
//     return res.status(400).json({ error: err.message });
//   }
//   console.error(err.stack);
//   res.status(500).json({ error: "Internal Server Error" });
// });

const port = process.env.PORT ? process.env.PORT : 4000;
app.listen(port, () => {
  console.log(`vandrex api server started running on port ${port}`);
});
