import express from "express";
import db from "../database/db.js";

const notificationRoute = express.Router();

notificationRoute.post("/create-new-notification", async (req, res) => {
  const { type, title, message, user_id } = req.body;
  db("notifications")
    .insert({
      user_id,
      type,
      title,
      message,
    })
    .returning("*")
    .then((notification) => {
      return res.status(200).json(notification[0]);
    })
    .catch((err) => {
      console.log(err);
      res.status(400).json("unable to post notification");
    });
});

notificationRoute.get("/get/user-notifications/:userId", async (req, res) => {
  db("notifications")
    .select("*")
    .where("user_id", req.params?.userId)
    .orderBy("time", "desc")
    .then((notifications) => {
      res.status(200).json(notifications);
    })
    .catch((err) => {
      console.log(err);
      res.status(400).json("cant get notifications");
    });
});


export default notificationRoute