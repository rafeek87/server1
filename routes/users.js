var AWS = require("aws-sdk");
const config = require("../config");
const { v4: uuidv4 } = require("uuid");
var dayjs = require("dayjs");
var utc = require("dayjs/plugin/utc");
var timezone = require("dayjs/plugin/timezone");
var jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");

dayjs.extend(utc);
dayjs.extend(timezone);

const addUser = async (req, res) => {
  let {
    userType,
    userName,
    password,
    privileges,
    createdBy,
    partner,
    stockist,
    subStockist,
    schemeName,
  } = req.body;

  const { apptoken } = req.headers;

  try {
    // get allowed app id from app token
    const appTokenVerification = jwt.verify(apptoken, "wmd66G0eFODn", {
      complete: true,
    });

    const docClient = new AWS.DynamoDB.DocumentClient();
    var params = {
      TableName: "Users-Tirur",
      Item: {
        id: uuidv4(),
        type: userType,
        name: userName,
        userName: userName.toLowerCase(),
        password: password.toLowerCase(),
        privileges: JSON.parse(privileges),
        createdAt: dayjs().tz("Asia/Calcutta").format(),
        isArchived: false,
        isLoginBlocked: false,
        isEntryBlocked: [],
        isSalesBlocked: false,
        // price:
        //   userType == "2"
        //     ? initialPriceStockist
        //     : userType == "3"
        //     ? initialPriceSubStockist
        //     : initialPriceAgent,
        price: initialPriceZero,
        createdBy,
        partner: partner != false ? partner : null,
        stockist: stockist != false ? stockist : null,
        subStockist: subStockist != false ? subStockist : null,
        schemeName,
        allowedApps: [appTokenVerification.payload["appId"]],
        incorrectPasswordEntries: 0,
      },
    };

    var params2 = {
      TableName: "Users-Tirur",
      ExpressionAttributeNames: {
        "#AT": "id",
        "#2": "userName",
      },
      ExpressionAttributeValues: {
        ":a": false,
        ":userName": userName.toLowerCase(),
      },
      FilterExpression: "isArchived = :a AND #2 = :userName",
      ProjectionExpression: "#AT",
    };

    let duplicateUsers;
    let duplicateUsersItems = [];
    do {
      duplicateUsers = await docClient.scan(params2).promise();
      duplicateUsersItems = duplicateUsersItems.concat(duplicateUsers.Items);
      params2.ExclusiveStartKey = duplicateUsers.LastEvaluatedKey;
    } while (typeof duplicateUsers.LastEvaluatedKey != "undefined");

    if (duplicateUsersItems.length != 0) {
      return res
        .status(200)
        .send({ status: "FAIL", message: "User name exists" });
    }

    let queryRes = await docClient.put(params).promise();
    return res.status(200).send({ status: "OK" });
  } catch (err) {
    console.log(err);
    return res.status(409).send({ err });
  }
};

const allUsers = async (req, res) => {
  let { userType, userId, userName } = req.query;
  try {
    const docClient = new AWS.DynamoDB.DocumentClient();
    if (userType == 1) {
      // send all partners, stockists, substockists, agents
      var params = {
        TableName: "Users-Tirur",
        ExpressionAttributeNames: {
          "#AT": "id",
          "#ST": "type",
          "#1": "isLoginBlocked",
          "#2": "name",
          "#3": "isSalesBlocked",
          "#4": "partner",
          "#5": "stockist",
          "#6": "subStockist",
          "#7": "schemeName",
          "#8": "password",
          "#9": "privileges",
          "#10": "createdAt",
          "#11": "percentageCut",
        },
        ExpressionAttributeValues: {
          ":a": false,
          ":adminType": "1",
        },
        FilterExpression: "isArchived = :a AND #ST <> :adminType",
        ProjectionExpression:
          "#ST, #AT, #1, #2, #3, #4, #5, #6, #7, #8, #9, #10, #11",
      };
    } else if (userType == 2) {
      // send all stockists, substockists, agents
      var params = {
        TableName: "Users-Tirur",
        ExpressionAttributeNames: {
          "#AT": "id",
          "#ST": "type",
          "#1": "isLoginBlocked",
          "#2": "name",
          "#3": "isSalesBlocked",
          "#4": "partner",
          "#5": "stockist",
          "#6": "subStockist",
          "#7": "schemeName",
          "#8": "password",
          "#9": "privileges",
          "#10": "createdAt",
          "#11": "percentageCut",
        },
        ExpressionAttributeValues: {
          ":a": false,
          ":stockistType": "3",
          ":subStockistType": "4",
          ":agentType": "5",
          ":userId": userId,
        },
        FilterExpression:
          "isArchived = :a AND #ST IN (:stockistType, :subStockistType, :agentType) AND #4 = :userId",
        ProjectionExpression:
          "#ST, #AT, #1, #2, #3, #4, #5, #6, #7, #8, #9, #10, #11",
      };
    } else if (userType == 3) {
      // send all substockists, agents
      var params = {
        TableName: "Users-Tirur",
        ExpressionAttributeNames: {
          "#AT": "id",
          "#ST": "type",
          "#1": "isLoginBlocked",
          "#2": "name",
          "#3": "isSalesBlocked",
          "#4": "stockist",
          "#5": "subStockist",
          "#6": "schemeName",
          "#7": "password",
          "#8": "privileges",
          "#9": "createdAt",
          "#11": "percentageCut",
        },
        ExpressionAttributeValues: {
          ":a": false,
          ":subStockistType": "4",
          ":agentType": "5",
          ":userId": userId,
        },
        FilterExpression:
          "isArchived = :a AND #ST IN (:subStockistType, :agentType) AND #4 = :userId",
        ProjectionExpression:
          "#ST, #AT, #1, #2, #3, #4, #5, #6, #7, #8, #9, #11",
      };
    } else if (userType == 4) {
      // send all substockists, agents
      var params = {
        TableName: "Users-Tirur",
        ExpressionAttributeNames: {
          "#AT": "id",
          "#ST": "type",
          "#1": "isLoginBlocked",
          "#2": "name",
          "#3": "isSalesBlocked",
          "#5": "subStockist",
          "#6": "schemeName",
          "#7": "password",
          "#8": "privileges",
          "#9": "createdAt",
          "#11": "percentageCut",
        },
        ExpressionAttributeValues: {
          ":a": false,
          ":agentType": "5",
          ":userId": userId,
        },
        FilterExpression:
          "isArchived = :a AND #ST = :agentType AND #5 = :userId",
        ProjectionExpression: "#ST, #AT, #1, #2, #3, #5, #6, #7, #8, #9, #11",
      };
    } else if (userType == 5) {
      return res.status(200).send({ data: { Items: [] } });
    }

    let usersList;
    let usersListItems = [];
    do {
      usersList = await docClient.scan(params).promise();
      usersListItems = usersListItems.concat(usersList.Items);
      params.ExclusiveStartKey = usersList.LastEvaluatedKey;
    } while (typeof usersList.LastEvaluatedKey != "undefined");

    usersListItems = usersListItems.sort((a, b) =>
      a.type < b.type
        ? -1
        : b.type < a.type
        ? 1
        : a.createdAt < b.createdAt
        ? -1
        : 1
    );
    // copy list
    const usersListCopy = usersListItems.map((object) => ({ ...object }));
    // replace all ids in second list with names
    usersListItems.map((user) => {
      if (user.partner) {
        let partnerData = usersListCopy.filter(
          (copyUser) => copyUser.id == user.partner
        );
        user.partner = partnerData.length != 0 ? partnerData[0].name : null;
        if (user.partner == null && userType == "2") {
          user.partner = userName;
        }
      }
      if (user.stockist) {
        let stockistData = usersListCopy.filter(
          (copyUser) => copyUser.id == user.stockist
        );
        user.stockist = stockistData.length != 0 ? stockistData[0].name : null;
        if (user.stockist == null && userType == "3") {
          user.stockist = userName;
        }
      }
      if (user.subStockist) {
        let subStockistData = usersListCopy.filter(
          (copyUser) => copyUser.id == user.subStockist
        );
        user.subStockist =
          subStockistData.length != 0 ? subStockistData[0].name : null;
        if (user.subStockist == null && userType == "4") {
          user.subStockist = userName;
        }
      }
    });
    return res.status(200).send({ data: { Items: usersListItems } });
  } catch (err) {
    console.log(err);
    return res.status(409).send({ err });
  }
};

const getAllPartners = async (req, res) => {
  try {
    const docClient = new AWS.DynamoDB.DocumentClient();

    var params = {
      TableName: "Users-Tirur",
      ExpressionAttributeNames: {
        "#AT": "id",
        "#2": "name",
        "#ST": "type",
      },
      ExpressionAttributeValues: {
        ":a": false,
        ":userType": "2",
      },
      FilterExpression: "isArchived = :a AND #ST = :userType",
      ProjectionExpression: "#AT, #2",
    };

    let userData;
    let userDataItems = [];
    do {
      userData = await docClient.scan(params).promise();
      userDataItems = userDataItems.concat(userData.Items);
      params.ExclusiveStartKey = userData.LastEvaluatedKey;
    } while (typeof userData.LastEvaluatedKey != "undefined");

    return res.status(200).send({ data: { Items: userDataItems } });
  } catch (err) {
    return res.status(409).send({ err });
  }
};

const getAllStockists = async (req, res) => {
  try {
    const { partnerId } = req.query;
    const docClient = new AWS.DynamoDB.DocumentClient();

    var params = {
      TableName: "Users-Tirur",
      ExpressionAttributeNames: {
        "#AT": "id",
        "#2": "name",
        "#ST": "type",
        "#SI": "partner",
      },
      ExpressionAttributeValues: {
        ":a": false,
        ":userType": "3",
        ":partnerId": partnerId,
      },
      FilterExpression:
        "isArchived = :a AND #ST = :userType AND #SI = :partnerId",
      ProjectionExpression: "#AT, #2",
    };

    let userData;
    let userDataItems = [];
    do {
      userData = await docClient.scan(params).promise();
      userDataItems = userDataItems.concat(userData.Items);
      params.ExclusiveStartKey = userData.LastEvaluatedKey;
    } while (typeof userData.LastEvaluatedKey != "undefined");

    return res.status(200).send({ data: { Items: userDataItems } });
  } catch (err) {
    return res.status(409).send({ err });
  }
};

const getAllSubStockists = async (req, res) => {
  try {
    let { stockistId } = req.query;
    const docClient = new AWS.DynamoDB.DocumentClient();

    var params = {
      TableName: "Users-Tirur",
      ExpressionAttributeNames: {
        "#AT": "id",
        "#2": "name",
        "#ST": "type",
        "#SI": "stockist",
      },
      ExpressionAttributeValues: {
        ":a": false,
        ":userType": "4",
        ":stockistId": stockistId,
      },
      FilterExpression:
        "isArchived = :a AND #ST = :userType AND #SI = :stockistId",
      ProjectionExpression: "#AT, #2",
    };

    let userData;
    let userDataItems = [];
    do {
      userData = await docClient.scan(params).promise();
      userDataItems = userDataItems.concat(userData.Items);
      params.ExclusiveStartKey = userData.LastEvaluatedKey;
    } while (typeof userData.LastEvaluatedKey != "undefined");

    return res.status(200).send({ data: { Items: userDataItems } });
  } catch (err) {
    return res.status(409).send({ err });
  }
};

const getUserInfo = (req, res) => {
  let { userId } = req.query;
  const docClient = new AWS.DynamoDB.DocumentClient();
  var params = {
    TableName: "Users-Tirur",
    // IndexName: "billNo-index",
    KeyConditionExpression: "id = :id",
    ExpressionAttributeValues: {
      ":id": userId,
      ":false": false,
    },
    // ExpressionAttributeNames: {
    //   "#name": "name",
    //   "#type": "type",
    // },
    FilterExpression: "isArchived = :false",
    // ProjectionExpression: "createdAt, id, #name, #type",
  };
  docClient.query(params, function (err, data) {
    if (err) {
      console.log(err);
      return res.status(409).send({ err });
    } else {
      return res.status(200).send({ userInfo: data });
    }
  });
};

const loginUser = async (req, res) => {
  let { userName, password } = req.query;
  try {
    const docClient = new AWS.DynamoDB.DocumentClient();
    var params = {
      TableName: "Users-Tirur",
      FilterExpression:
        "#userName = :userName and #password = :password and isArchived = :false",
      ExpressionAttributeValues: {
        ":false": false,
        ":userName": userName.toLowerCase(),
        ":password": password.toLowerCase(),
      },
      ExpressionAttributeNames: {
        "#userName": "userName",
        "#password": "password",
      },
    };

    let userData;
    let userDataItems = [];
    do {
      userData = await docClient.scan(params).promise();
      userDataItems = userDataItems.concat(userData.Items);
      params.ExclusiveStartKey = userData.LastEvaluatedKey;
    } while (typeof userData.LastEvaluatedKey != "undefined");

    if (userDataItems.length == 0) {
      // no user / password combo
      return res.status(200).send({ status: "INVALID", userData: [] });
    } else if (userDataItems[0].isLoginBlocked) {
      return res.status(200).send({ status: "BLOCKED", userData: [] });
    } else {
      var token = jwt.sign({ userId: userDataItems[0].id }, "thedopesecret", {
        expiresIn: "2h",
      });
      return res
        .status(200)
        .send({ status: "OK", userData: userDataItems, token });
    }
  } catch (err) {
    console.log(err);
    return res.status(409).send({ err });
  }
};

const blockUser = (req, res) => {
  let { userId, userType, blockType, isBlocking } = req.query;
  try {
    const docClient = new AWS.DynamoDB.DocumentClient();
    var params = {
      TableName: "Users-Tirur",
      Key: {
        id: userId,
        type: userType,
      },
      UpdateExpression:
        blockType == "LoginBlock"
          ? "set isLoginBlocked = :isBlocking"
          : "set isSalesBlocked = :isBlocking",
      ExpressionAttributeValues: {
        ":isBlocking": isBlocking == "true" ? true : false,
      },
      ReturnValues: "UPDATED_NEW",
    };

    docClient.update(params, function (err, data) {
      if (err) {
        console.log(err);
        return res.status(409).send({ err });
      } else {
        return res.status(200).send({ userData: data });
      }
    });
  } catch (err) {
    console.log(err);
    return res.status(409).send({ err });
  }
};

const getSubUsers = async (req, res) => {
  // get all sub users and stockist data if user is substockist and stockist, substockist data if user is agent
  let { userType, userId, partnerId, stockistId, subStockistId } = req.query;
  var userType_name = "";
  switch (userType.toString()) {
    case "1":
      userType_name = "admin";
      break;
    case "2":
      userType_name = "partner";
      break;
    case "3":
      userType_name = "stockist";
      break;
    case "4":
      userType_name = "subStockist";
      break;
    default:
      break;
  }

  var params2 = false;

  let partnerParams = false;

  try {
    const docClient = new AWS.DynamoDB.DocumentClient();

    if (userType == 1) {
      // admin
      // send all stockists, substockists, agents
      var params = {
        TableName: "Users-Tirur",
        ExpressionAttributeNames: {
          "#ST": "type",
        },
        ExpressionAttributeValues: {
          ":a": false,
          ":adminType": "1",
        },
        FilterExpression: "isArchived = :a AND #ST <> :adminType",
      };
    } else if (userType == 2) {
      // partner
      // send all stockists, substockists, agents
      var params = {
        TableName: "Users-Tirur",
        ExpressionAttributeNames: {
          "#ST": "type",
          "#SID": "partner",
        },
        ExpressionAttributeValues: {
          ":a": false,
          ":stockistType": "3",
          ":subStockistType": "4",
          ":agentType": "5",
          ":userId": userId,
        },
        FilterExpression:
          "isArchived = :a AND #ST IN (:stockistType, :subStockistType, :agentType) AND #SID = :userId",
      };
    } else if (userType == 3) {
      // stockist
      // send all substockists, agents
      var params = {
        TableName: "Users-Tirur",
        ExpressionAttributeNames: {
          "#ST": "type",
          "#SID": "stockist",
        },
        ExpressionAttributeValues: {
          ":a": false,
          ":subStockistType": "4",
          ":agentType": "5",
          ":userId": userId,
        },
        FilterExpression:
          "isArchived = :a AND #ST IN (:subStockistType, :agentType) AND #SID = :userId",
      };

      partnerParams = {
        TableName: "Users-Tirur",
        KeyConditionExpression: "id = :sid",
        ExpressionAttributeValues: {
          ":sid": partnerId,
          ":false": false,
        },
        FilterExpression: "isArchived = :false",
      };
    } else if (userType == 4) {
      // substockist
      // send all agents
      var params = {
        TableName: "Users-Tirur",
        ExpressionAttributeNames: {
          "#ST": "type",
          "#SSID": "subStockist",
        },
        ExpressionAttributeValues: {
          ":a": false,
          ":agentType": "5",
          ":userId": userId,
        },
        FilterExpression:
          "isArchived = :a AND #ST = :agentType AND #SSID = :userId",
      };

      params2 = {
        TableName: "Users-Tirur",
        KeyConditionExpression: "id = :sid",
        ExpressionAttributeValues: {
          ":sid": stockistId,
          ":false": false,
        },
        FilterExpression: "isArchived = :false",
      };
      partnerParams = {
        TableName: "Users-Tirur",
        KeyConditionExpression: "id = :sid",
        ExpressionAttributeValues: {
          ":sid": partnerId,
          ":false": false,
        },
        FilterExpression: "isArchived = :false",
      };
    } else if (userType == 5) {
      params2 = {
        TableName: "Users-Tirur",
        KeyConditionExpression: "id = :sid",
        ExpressionAttributeValues: {
          ":sid": stockistId,
          ":false": false,
        },
        FilterExpression: "isArchived = :false",
      };
      let params3 = {
        TableName: "Users-Tirur",
        KeyConditionExpression: "id = :ssid",
        ExpressionAttributeValues: {
          ":ssid": subStockistId,
          ":false": false,
        },
        FilterExpression: "isArchived = :false",
      };
      partnerParams = {
        TableName: "Users-Tirur",
        KeyConditionExpression: "id = :sid",
        ExpressionAttributeValues: {
          ":sid": partnerId,
          ":false": false,
        },
        FilterExpression: "isArchived = :false",
      };
      let partnerData = await docClient.query(partnerParams).promise();
      let stockistData = await docClient.query(params2).promise();
      let subStockistData = await docClient.query(params3).promise();
      stockistData.Items.push(subStockistData.Items[0]);
      stockistData.Items.push(partnerData.Items[0]);
      return res.status(200).send({ data: stockistData });
    }

    let usersList;
    let usersListItems = [];
    do {
      usersList = await docClient.scan(params).promise();
      usersListItems = usersListItems.concat(usersList.Items);
      params.ExclusiveStartKey = usersList.LastEvaluatedKey;
    } while (typeof usersList.LastEvaluatedKey != "undefined");

    usersListItems = usersListItems.sort((a, b) =>
      a.type < b.type
        ? -1
        : b.type < a.type
        ? 1
        : a.createdAt < b.createdAt
        ? -1
        : 1
    );

    // get stockist data if usertype is substockist or agent
    if (params2 != false) {
      let stockistData = await docClient.query(params2).promise();
      usersListItems.push(stockistData.Items[0]);
    }

    if (partnerParams != false) {
      let partnerData = await docClient.query(partnerParams).promise();
      usersListItems.push(partnerData.Items[0]);
    }
    return res.status(200).send({ data: { Items: usersListItems } });
  } catch (err) {
    console.log(err);
    return res.status(409).send({ err });
  }
};

const getPrice = async (req, res) => {
  try {
    let { userId, adminType } = req.query;

    var params = {
      TableName: "Users-Tirur",
      // IndexName: "billNo-index",
      ExpressionAttributeValues: {
        ":id": userId,
        ":false": false,
      },
      KeyConditionExpression: "id = :id",
      ExpressionAttributeNames: {
        "#name": "name",
        "#type": "type",
      },
      FilterExpression: "isArchived = :false",
      ProjectionExpression:
        "id, #name, #type, price, partner, stockist, subStockist",
    };

    const docClient = new AWS.DynamoDB.DocumentClient();
    let queryRes = await docClient.query(params).promise();
    var newPrice = [];
    if (queryRes.Items[0].type == "2") {
      // get admin price
      if (adminType == "1") {
        var adminData = await docClient.query(getPriceParams("1")).promise();
      } else {
        var adminData = null;
      }
    } else if (queryRes.Items[0].type == "3") {
      // get partner price
      if (adminType == "1" || adminType == "2") {
        var adminData = await docClient
          .query(getPriceParams(queryRes.Items[0].partner))
          .promise();
      } else {
        var adminData = null;
      }
    } else if (queryRes.Items[0].type == "4") {
      // get stockist price
      if (adminType == "1" || adminType == "2" || adminType == "3") {
        var adminData = await docClient
          .query(getPriceParams(queryRes.Items[0].stockist))
          .promise();
      } else {
        var adminData = null;
      }
    } else if (queryRes.Items[0].type == "5") {
      // get substockist price
      if (adminType != "5") {
        var adminData = await docClient
          .query(getPriceParams(queryRes.Items[0].subStockist))
          .promise();
      } else {
        var adminData = null;
      }
    }
    let adminPrice = adminData == null ? null : adminData.Items[0].price;
    // TODO if adminData is null, handle exception
    queryRes.Items[0].price.forEach((item, index) => {
      let tempModes = [];
      item.modes.forEach((element, index2) => {
        tempModes.push({
          ...element,
          super_amount:
            adminPrice == null ? "" : adminPrice[index].modes[index2].amount,
        });
      });
      let temp = { ticket: item.ticket, modes: tempModes };
      newPrice.push(temp);
    });
    // return res.status(200).send({ userInfo: newPrice });
    let resObj = { ...queryRes.Items[0], price: newPrice };
    return res.status(200).send({ userInfo: resObj });
  } catch (error) {
    console.log(error);
    return res.status(409).send({ error });
  }
};

const editPrice = async (req, res) => {
  let { userId, userType, ticketIndex, newPrice } = req.body;
  newPriceParsed = [];
  newPrice.forEach((item) => {
    newPriceParsed.push({
      name: item.name,
      amount: Number(item.amount),
      isActive: item.isActive,
    });
  });
  try {
    const docClient = new AWS.DynamoDB.DocumentClient();
    var params = {
      TableName: "Users-Tirur",
      Key: {
        id: userId,
        type: userType,
      },
      UpdateExpression: `set price[${ticketIndex}].modes = :newPrice`,
      ExpressionAttributeValues: {
        ":newPrice": newPriceParsed,
      },
      ReturnValues: "UPDATED_NEW",
    };
    let queryRes = docClient.update(params).promise();
    return res.status(200).send({ data: queryRes });
    // return res.status(200).send({ });
  } catch (err) {
    console.log(err);
    return res.status(409).send({ err });
  }
};

const editAllPrice = async (req, res) => {
  // validation
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log(errors.array());
    return res.status(400).json({ errors: errors.array() });
  }

  let { userId, userType, newPrice, ticketName } = req.body;
  newPriceParsed = [];
  newPrice.forEach((item) => {
    newPriceParsed.push({
      name: item.name,
      amount: Number(item.amount),
      isActive: item.isActive,
    });
  });
  try {
    const docClient = new AWS.DynamoDB.DocumentClient();
    const UpdateExpression =
      ticketName == "LSK3"
        ? "set price[1].modes = :newPrice"
        : "set price[0].modes = :newPrice, price[2].modes = :newPrice, price[3].modes = :newPrice";
    var params = {
      TableName: "Users-Tirur",
      Key: {
        id: userId,
        type: userType,
      },
      UpdateExpression,
      ExpressionAttributeValues: {
        ":newPrice": newPriceParsed,
      },
      ReturnValues: "UPDATED_NEW",
    };
    let queryRes = docClient.update(params).promise();
    return res.status(200).send({ data: queryRes });
    // return res.status(200).send({ });
  } catch (err) {
    console.log(err);
    return res.status(409).send({ err });
  }
};

const deleteUser = async (req, res) => {
  try {
    let { userId, userType } = req.query;
    const docClient = new AWS.DynamoDB.DocumentClient();
    var params = {
      TableName: "Users-Tirur",
      Key: {
        id: userId,
        type: userType,
      },
      UpdateExpression: "set isArchived = :true",
      ExpressionAttributeValues: {
        ":true": true,
      },
    };
    let queryRes = await docClient.update(params).promise();
    res.status(200).send({ queryRes });
  } catch (err) {
    console.error(err);
    res.status(409).send({ err });
  }
};

const editUser = async (req, res) => {
  let {
    userId,
    userType,
    newName,
    newPassword,
    newScheme,
    newPermissions,
    newPercentageCut,
  } = req.body;
  try {
    const docClient = new AWS.DynamoDB.DocumentClient();
    var params = {
      TableName: "Users-Tirur",
      Key: {
        id: userId,
        type: userType,
      },
      UpdateExpression:
        "set #name = :newName, #userName = :newUserName, password = :newPassword, schemeName = :newScheme, #privileges = :newPermissions, #percentageCut = :newPercentageCut",
      ExpressionAttributeNames: {
        "#name": "name",
        "#userName": "userName",
        "#privileges": "privileges",
        "#percentageCut": "percentageCut",
      },
      ExpressionAttributeValues: {
        ":newName": newName,
        ":newUserName": newName.toLowerCase(),
        ":newPassword": newPassword.toLowerCase(),
        ":newScheme": newScheme,
        ":newPermissions": newPermissions,
        ":newPercentageCut": newPercentageCut,
      },
      ReturnValues: "UPDATED_NEW",
    };

    let queryRes = await docClient.update(params).promise();
    return res.status(200).send({ userData: queryRes });
  } catch (err) {
    console.log(err);
    return res.status(409).send({ err });
  }
};

let getPriceParams = (userId) => {
  let params = {
    TableName: "Users-Tirur",
    KeyConditionExpression: "id = :id",
    ExpressionAttributeValues: {
      ":id": userId,
      ":false": false,
    },
    ExpressionAttributeNames: {
      "#name": "name",
      "#type": "type",
    },
    FilterExpression: "isArchived = :false",
    ProjectionExpression:
      "id, #name, #type, price, partner, stockist, subStockist",
  };
  return params;
};

let getAdminPrice = (req, res) => {
  const docClient = new AWS.DynamoDB.DocumentClient();
  var params = {
    TableName: "Users-Tirur",
    // IndexName: "billNo-index",
    KeyConditionExpression: "id = :id",
    ExpressionAttributeValues: {
      ":id": "1",
    },
    ExpressionAttributeNames: {
      "#name": "name",
      "#type": "type",
      "#price": "price",
    },
    ProjectionExpression: "id, #name, #type, #price",
  };
  docClient.query(params, function (err, data) {
    if (err) {
      console.log(err);
      return res.status(409).send({ err });
    } else {
      return res.status(200).send({ userInfo: data });
    }
  });
};

const initialPriceZero = [
  {
    modes: [
      {
        amount: "",
        name: "SUPER",
      },
      {
        amount: "",
        name: "BOX",
      },
      {
        amount: "",
        name: "AB",
      },
      {
        amount: "",
        name: "BC",
      },
      {
        amount: "",
        name: "AC",
      },
      {
        amount: "",
        name: "A",
      },
      {
        amount: "",
        name: "B",
      },
      {
        amount: "",
        name: "C",
      },
    ],
    ticket: "DEAR1",
  },
  {
    modes: [
      {
        amount: "",
        name: "SUPER",
      },
      {
        amount: "",
        name: "BOX",
      },
      {
        amount: "",
        name: "AB",
      },
      {
        amount: "",
        name: "BC",
      },
      {
        amount: "",
        name: "AC",
      },
      {
        amount: "",
        name: "A",
      },
      {
        amount: "",
        name: "B",
      },
      {
        amount: "",
        name: "C",
      },
    ],
    ticket: "LSK3",
  },
  {
    modes: [
      {
        amount: "",
        name: "SUPER",
      },
      {
        amount: "",
        name: "BOX",
      },
      {
        amount: "",
        name: "AB",
      },
      {
        amount: "",
        name: "BC",
      },
      {
        amount: "",
        name: "AC",
      },
      {
        amount: "",
        name: "A",
      },
      {
        amount: "",
        name: "B",
      },
      {
        amount: "",
        name: "C",
      },
    ],
    ticket: "DEAR6",
  },
  {
    modes: [
      {
        amount: "",
        name: "SUPER",
      },
      {
        amount: "",
        name: "BOX",
      },
      {
        amount: "",
        name: "AB",
      },
      {
        amount: "",
        name: "BC",
      },
      {
        amount: "",
        name: "AC",
      },
      {
        amount: "",
        name: "A",
      },
      {
        amount: "",
        name: "B",
      },
      {
        amount: "",
        name: "C",
      },
    ],
    ticket: "DEAR8",
  },
];

module.exports = {
  addUser,
  allUsers,
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
};
