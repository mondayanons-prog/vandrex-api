"use strict";
import jwt from "jsonwebtoken";

class jwtAuthentification {
  constructor() {}

  async isAuthenticated(req, res, next) {
    // 1. If already attached to request, move on immediately
    if (req.user?.user_id) {
      return next(); 
    }

    // 2. If no cookie, reject immediately
    if (!req.cookies?.auth) {
      return res.status(401).json("no cookie provided"); // 401 is better for missing auth
    }
    
    // 3. Verify token
    try {
      // Note: jwt.verify is synchronous unless you provide a callback, 
      // but await won't hurt it here.
      const user = await jwt.verify(req.cookies.auth, process.env.JWTAUTHSECRET);
      
      if (user.user_id) {
        req.user = user; // FIX: Attach the user to the request so fundWallet can use it!
        return next();
      } else {
        return res.status(401).json(`not authenticated, error getting user`);
      }
    } catch (error) {
      return res.status(401).json(`error verifying token`);
    }
  }

  async normalAuthWithCookie(req, res, next) {
    if (!req.cookies?.auth) {
      console.log(`no session auth cookie provided. User not logged in`);
      return next(); // Added return for safety/consistency
    } 
    
    try {
      const user = await jwt.verify(req.cookies.auth, process.env.JWTAUTHSECRET);
      req.user = user;
      return next();
    } catch (error) {
      console.log(`User not logged in, error verifying token`);
      return next();
    }
  }

  generatedAuthToken(user) {
    const jwtAuthToken = jwt.sign(user, process.env.JWTAUTHSECRET, {
      expiresIn: "300d",
    });
    return jwtAuthToken;
  }
}

const jwtAuth = new jwtAuthentification();
export default jwtAuth;