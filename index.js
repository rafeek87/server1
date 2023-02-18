const express = require("express");
var AWS = require("aws-sdk");
const app = express();
const bodyParser = require("body-parser");
const cors = require("cors");
const port = process.env.PORT || 5000;
const config = require("./config");
var fs = require("fs");
var morgan = require("morgan");
var path = require("path");
const cluster = require("cluster");
const { query, body } = require("express-validator");

AWS.config.update(config.aws_remote_config);

// create a write stream (in append mode)
var accessLogStream = fs.createWriteStream(path.join(__dirname, "access.log"), {
  flags: "a",
});

const {
  allUsers,
  addUser,
  getAllPartners,
  getAllStockists,
  getAllSubStockists,
  getUserInfo,
  blockUser,
  getSubUsers,
  getPrice,
  editPrice,
  editAllPrice,
  deleteUser,
  editUser,
  getAdminPrice,
  loginUser,
} = require("./routes/users");

const {
  ticketEntry,
  getBill,
  deleteBill,
  editTicket,
  deleteTicket,
} = require("./routes/entries");
const { getSalesSummery, getDateSummery } = require("./routes/summery");
const { getSalesReport, numberwise } = require("./routes/salesReport");
const { getScheme, editScheme } = require("./routes/schemes");
const { resultEntry, getResults } = require("./routes/results");
const {
  getDateBlocks,
  deleteBlock,
  addDateBlock,
  getCountBlocks,
  addCountBlock,
  editCountBlock,
  getUserBlocks,
  addUserBlocks,
  addSeriesCountBlock,
  deleteUserBlock,
  editUserBlock,
  addUserSeriesBlocks,
} = require("./routes/blocks");

const {
  getWinnersSummery,
  getWinnersUserSummery,
  getWinners,
} = require("./routes/winners");

const { getAccountSummery } = require("./routes/accountSummery");
const { getNetPay } = require("./routes/netPay");

const swStats = require("swagger-stats");
const apiSpec = require("./swagger.json");
const {
  deleteTicketsByDate,
  confirmAdminPassword,
  changeAdminPassword,
  deleteSingleTicket,
} = require("./routes/admin");

const cCPUs = require("os").cpus().length;

app.use(swStats.getMiddleware({ swaggerSpec: apiSpec }));

if (cluster.isMaster) {
  // Create a worker for each CPU
  for (let i = 0; i < cCPUs; i++) {
    cluster.fork();
  }
  cluster.on("online", function (worker) {
    console.log("Worker " + worker.process.pid + " is online.");
  });
  cluster.on("exit", function (worker, code, signal) {
    console.log("worker " + worker.process.pid + " died.");
  });
} else {
  app.use(cors());
  app.use(bodyParser.urlencoded({ extended: false, limit: "50mb" }));
  app.use(bodyParser.json());
  // app.use(morgan("dev"));

  app.get("/", (req, res) => {
    res.status(200).send("pinged home");
  });
  app.get("/ping", (req, res) => {
    res.status(200).send("pinged");
  });

  app.get(
    "/loginUser",
    morgan(
      ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"',
      { stream: accessLogStream }
    ),
    loginUser
  );

  app.post("/ticketEntry", ticketEntry);
  app.get("/getBill", getBill);
  app.delete("/deleteBill", deleteBill);
  app.patch("/editTicket", editTicket);
  app.delete("/deleteTicket", deleteTicket);

  app.get("/getSalesSummery", getSalesSummery);
  app.get("/getDateSummery", getDateSummery);
  app.get("/getSalesReport", getSalesReport);

  app.post("/addUser", addUser);
  app.get("/allUsers", allUsers);
  app.get("/getAllPartners", getAllPartners);
  app.get("/getAllStockists", getAllStockists);
  app.get("/getAllSubStockists", getAllSubStockists);
  app.get("/getUserInfo", getUserInfo);
  app.get("/blockUser", blockUser);
  app.get("/getSubUsers", getSubUsers);
  app.get("/getPrice", getPrice);
  app.put("/editPrice", editPrice);
  app.put(
    "/editAllPrice",
    body("ticketName").isIn(["LSK3", "DEAR1", "DEAR6", "DEAR8"]),
    body(["userId", "userType", "newPrice"]).notEmpty(),
    editAllPrice
  );
  app.delete("/deleteUser", deleteUser);
  app.put("/editUser", editUser);
  app.get("/getAdminPrice", getAdminPrice);

  app.get("/getScheme", getScheme);
  app.put("/editScheme", editScheme);

  app.get("/getDateBlocks", getDateBlocks);
  app.post("/addDateBlock", addDateBlock);
  app.delete("/deleteBlock", deleteBlock);

  app.get("/getCountBlocks", getCountBlocks);
  app.post("/addCountBlock", addCountBlock);
  app.post("/addSeriesCountBlock", addSeriesCountBlock);
  app.post("/editCountBlock", editCountBlock);

  app.get("/getUserBlocks", getUserBlocks);
  app.post("/addUserBlocks", addUserBlocks);
  app.post("/addUserSeriesBlocks", addUserSeriesBlocks);
  app.post("/deleteUserBlock", deleteUserBlock);
  app.post("/editUserBlock", editUserBlock);

  app.get("/getResults", getResults);
  app.post("/resultEntry", resultEntry);

  app.get("/getWinnersSummery", getWinnersSummery);
  app.get("/getWinnersUserSummery", getWinnersUserSummery);
  app.get("/getWinners", getWinners);

  app.get("/numberwise", numberwise);

  app.get("/accountSummery", getAccountSummery);
  app.get("/netPay", getNetPay);

  app.post(
    "/admin/deleteTickets",
    body("ticketName").isIn(["ALL", "LSK3", "DEAR1", "DEAR6", "DEAR8"]),
    body(["startDate", "endDate"]).isISO8601("yyyy-mm-dd"),
    body(["userType", "userId"]).notEmpty(),
    deleteTicketsByDate
  );

  app.post(
    "/admin/confirmAdminPassword",
    body(["password", "userId"]).notEmpty(),
    body(["userType"]).isNumeric(),
    confirmAdminPassword
  );

  app.patch(
    "/admin/changeAdminPassword",
    body(["newPassword", "userId"]).notEmpty(),
    body(["userType"]).isNumeric(),
    changeAdminPassword
  );

  app.post(
    "/admin/deleteSingleTicket",
    body(["billNo", "userType"]).notEmpty(),
    deleteSingleTicket
  );

  app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
  });
}
