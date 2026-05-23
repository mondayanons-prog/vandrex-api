import express from "express"
import userRoute from "../controllers/users.js";
import notificationRoute from "../controllers/notifications.js";

const routes = express.Router();


routes.use("/users", userRoute);
routes.use("/notifications", notificationRoute)


export default routes