import express from "express";
import db from "../database/db.js"; // Note: Add .js here too if needed
import bcrypt from "bcryptjs";
import jwtAuth from "../middlewares/jwt.js";

const userRoute = express.Router();

const isProduction = process.env.NODE_ENV === "production";

const maxAgeDuration = 300 * 24 * 60 * 60 * 1000;

userRoute.post("/create-new-account", async (req, res) => {
  const {
    firstName,
    lastName,
    email,
    phoneNumber,
    dateOfBirth,
    country,
    addressLine,
    city,
    postalCode,
    password,
  } = req.body;

  if (
    !password ||
    !firstName ||
    !lastName ||
    !email ||
    !dateOfBirth ||
    !addressLine ||
    !country ||
    !city ||
    !postalCode
  ) {
    return res
      .status(400)
      .json("You have missing piece of required information");
  }

  try {
    const saltRounds = 10;
    const hash = await bcrypt.hash(password, saltRounds);

    const userCredentials = await db.transaction(async (trx) => {
      const [insertedUser] = await trx("users")
        .insert({
          email,
          phone_number: phoneNumber,
          first_name: firstName,
          last_name: lastName,
          date_of_birth: dateOfBirth,
          country,
          address_line: addressLine,
          city,
          postal_code: postalCode,
        })
        .returning("*");
      await trx("signin").insert({
        email,
        hash,
      });

      return insertedUser;
    });

    const jwtToken = jwtAuth.generatedAuthToken(userCredentials);

    res.cookie("auth", jwtToken, {
      maxAge: maxAgeDuration, // Set the cookie expiration in milliseconds
      httpOnly: true, // Recommended: makes the cookie inaccessible to client-side JavaScript
      secure: isProduction, // Ensures cookie is only sent over HTTPS in production, // Recommended: ensures the cookie is only sent over HTTPS (in production)
      sameSite: isProduction ? "none" : "lax", // Recommended: helps mitigate CSRF attacks
    });
    return res.status(200).json(userCredentials);
  } catch (err) {
    console.error(err);
    return res.status(400).json("Could not complete the account creation");
  }
});

userRoute.post("/signin", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json("NO CREDENTIAL PROVIDED");
  }

  try {
    const dbHash = await db("signin")
      .select("hash")
      .where("email", email)
      .first();

    if (!dbHash) {
      return res.status(400).json("Invalid email or password");
    }
    const isValidPassword = await bcrypt.compare(password, dbHash.hash);
    if (!isValidPassword) {
      return res.status(400).json("Invalid email or password");
    }
    const user = await db("users").select("*").where("email", email).first();
    const jwtToken = jwtAuth.generatedAuthToken(user);
    res.cookie("auth", jwtToken, {
      maxAge: maxAgeDuration, // Set the cookie expiration in milliseconds
      httpOnly: true, // Recommended: makes the cookie inaccessible to client-side JavaScript
      secure: isProduction, // Ensures cookie is only sent over HTTPS in production, // Recommended: ensures the cookie is only sent over HTTPS (in production)
      sameSite: isProduction ? "none" : "lax", // Recommended: helps mitigate CSRF attacks
    });
    return res.status(200).json(user);
  } catch (err) {
    console.error(err);
    return res.status(500).json("Internal server error");
  }
});

userRoute.get("/authenticate-user", async (req, res) => {
  if (req?.user?.user_id) {
    res.status(200).json(req.user);
  } else {
    res.json("not authenticated");
  }
});
 
export default userRoute;
