"use strict";
import jwt from "jsonwebtoken";

class jwtAuthentification {
  constructor() {}
  isAuthenticated(req, res, next) {
    if (req.user?.user_id) next();
    if (!req.cookies?.auth) res.status(400).json("no cookie provided");
    else
      try {
        const user = jwt.verify(req.cookies?.auth, process.env.JWTAUTHSECRET);
        if (user.user_id) next();
        else res.status(400).json(`not authenticated, error getting user`);
      } catch (error) {
        res.status(400).json(`error verifying token`);
      }
  }

  normalAuthWithCookie(req, res, next) {
    if (!req.cookies.auth) {
      console.log(`no session auth cookie provided. User not logged in`);
      next();
    } else
      try {
        const user = jwt.verify(req.cookies.auth, process.env.JWTAUTHSECRET);
        req.user = user;
        next();
      } catch (error) {
        next();
        console.log(`User not logged in, error verifying token`);
      }
  }

  generatedAuthToken(user) {
    const jwtAuthToken = jwt.sign(user, process.env.JWTAUTHSECRET, {
      expiresIn: "300d",
    });
    return jwtAuthToken;
  }
}

const jwtAuth = new jwtAuthentification()
export default jwtAuth;
