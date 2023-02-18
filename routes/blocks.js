var AWS = require("aws-sdk");
const config = require("../config");
const { v4: uuidv4 } = require("uuid");
var dayjs = require("dayjs");
var objectSupport = require("dayjs/plugin/objectSupport");
var utc = require("dayjs/plugin/utc");
var timezone = require("dayjs/plugin/timezone");
var { getBasicUserInfo } = require("../helpers/getBasicUserInfo");
var { findPermutations } = require("../helpers/index");

dayjs.extend(utc);
dayjs.extend(timezone);

const getDateBlocks = async (req, res) => {
  try {
    const docClient = new AWS.DynamoDB.DocumentClient();
    var params = {
      TableName: "Blocks-Tirur",
      ExpressionAttributeValues: {
        ":blockMode": "DATE",
      },
      FilterExpression: "blockMode = :blockMode",
    };

    let dateBlocks;
    let dateBlocksItems = [];
    do {
      dateBlocks = await docClient.scan(params).promise();
      dateBlocksItems = dateBlocksItems.concat(dateBlocks.Items);
      params.ExclusiveStartKey = dateBlocks.LastEvaluatedKey;
    } while (typeof dateBlocks.LastEvaluatedKey != "undefined");

    return res.status(200).send({
      data: dateBlocksItems,
    });
  } catch (err) {
    console.error(err);
    res.status(409).send({ err });
  }
};

const addDateBlock = async (req, res) => {
  try {
    let { ticketName, resultDate } = req.body;
    const docClient = new AWS.DynamoDB.DocumentClient();
    var params = {
      TableName: "Blocks-Tirur",
      Item: {
        id: uuidv4(),
        ticketName,
        blockMode: "DATE",
        resultDate,
        createdAt: dayjs().tz("Asia/Calcutta").format(),
      },
    };
    let blockRes = await docClient.put(params).promise();
    return res.status(200).send({
      message: "OK",
      blockRes,
    });
  } catch (err) {
    console.error(err);
    res.status(409).send({ err });
  }
};

const deleteBlock = async (req, res) => {
  try {
    let { blockId, ticketName } = req.query;
    const docClient = new AWS.DynamoDB.DocumentClient();
    var params = {
      TableName: "Blocks-Tirur",
      Key: {
        id: blockId,
        ticketName,
      },
    };
    let blockRes = await docClient.delete(params).promise();
    return res.status(200).send({
      message: "OK",
      blockRes,
    });
  } catch (err) {
    console.error(err);
    res.status(409).send({ err });
  }
};

const getCountBlocks = async (req, res) => {
  try {
    const docClient = new AWS.DynamoDB.DocumentClient();
    var params = {
      TableName: "Blocks-Tirur",
      ExpressionAttributeValues: {
        ":blockMode": "COUNT",
      },
      FilterExpression: "blockMode = :blockMode",
    };

    let dateBlocks;
    let dateBlocksItems = [];
    do {
      dateBlocks = await docClient.scan(params).promise();
      dateBlocksItems = dateBlocksItems.concat(dateBlocks.Items);
      params.ExclusiveStartKey = dateBlocks.LastEvaluatedKey;
    } while (typeof dateBlocks.LastEvaluatedKey != "undefined");

    return res.status(200).send({
      data: dateBlocksItems,
    });
  } catch (err) {
    console.error(err);
    res.status(409).send({ err });
  }
};

const addCountBlock = async (req, res) => {
  try {
    let { ticketName, mode, count, group, number } = req.body;
    const docClient = new AWS.DynamoDB.DocumentClient();

    // get current blocks
    var params1 = {
      TableName: "Blocks-Tirur",
      ExpressionAttributeValues: {
        ":blockMode": "COUNT",
      },
      FilterExpression: "blockMode = :blockMode",
    };

    let dateBlocks;
    let dateBlocksItems = [];
    do {
      dateBlocks = await docClient.scan(params1).promise();
      dateBlocksItems = dateBlocksItems.concat(dateBlocks.Items);
      params1.ExclusiveStartKey = dateBlocks.LastEvaluatedKey;
    } while (typeof dateBlocks.LastEvaluatedKey != "undefined");

    // check for duplicates
    const duplicateFlag = dateBlocksItems.findIndex(
      (i) =>
        i.ticketName == ticketName &&
        i.mode == mode &&
        i.number == number &&
        i.group == group
    );

    if (duplicateFlag !== -1) {
      // duplicate entry exists
      return res.status(409).send({ message: "Entry exists" });
    }

    var params = {
      TableName: "Blocks-Tirur",
      Item: {
        id: uuidv4(),
        ticketName,
        mode,
        blockMode: "COUNT",
        count,
        group,
        number,
        createdAt: dayjs().tz("Asia/Calcutta").format(),
      },
    };
    let blockRes = await docClient.put(params).promise();
    return res.status(200).send({
      message: "OK",
      blockRes,
    });
  } catch (err) {
    console.error(err);
    res.status(409).send({ err });
  }
};

const addSeriesCountBlock = async (req, res) => {
  try {
    const { ticketName, mode, count, group, number, start, end, option } =
      req.body;

    const newBlocks = [];

    if (option == null) {
      newBlocks.push({
        id: uuidv4(),
        count: count,
        group: group,
        mode: mode,
        number: parsedNumber,
        ticketName: ticketName,
        blockMode: "COUNT",
        createdAt: dayjs()
          .add(newBlocks.length, "second")
          .tz("Asia/Calcutta")
          .format(),
      });
    } else if (option == "Range") {
      // validations
      if (Number(start) > Number(end)) {
        return res.status(400).send({ message: "INVALID DATA" });
      }
      for (let number = Number(start); number <= Number(end); number++) {
        let parsedNumber = number.toString();
        if (number < 100 && group == "3") {
          parsedNumber = parsedNumber.padStart(3, "0");
        } else if (number < 10 && group == "2") {
          parsedNumber = parsedNumber.padStart(2, "0");
        }
        newBlocks.push({
          id: uuidv4(),
          count: count,
          group: group,
          mode: mode,
          number: parsedNumber,
          ticketName: ticketName,
          blockMode: "COUNT",
          createdAt: dayjs()
            .add(newBlocks.length, "second")
            .tz("Asia/Calcutta")
            .format(),
        });
      }
    } else if (option == "Set") {
      const permuations = findPermutations(number);
      permuations.forEach((number) => {
        let parsedNumber = number.toString();
        if (number < 100 && group == "3") {
          parsedNumber = parsedNumber.padStart(3, "0");
        } else if (number < 10 && group == "2") {
          parsedNumber = parsedNumber.padStart(2, "0");
        }
        newBlocks.push({
          id: uuidv4(),
          count: count,
          group: group,
          mode: mode,
          number: parsedNumber,
          ticketName: ticketName,
          blockMode: "COUNT",
          createdAt: dayjs()
            .add(newBlocks.length, "second")
            .tz("Asia/Calcutta")
            .format(),
        });
      });
    } else if (option == "100") {
      // validations
      if (Number(start) > Number(end)) {
        return res.status(400).send({ message: "INVALID DATA" });
      }
      for (let number = Number(start); number <= Number(end); number += 100) {
        let parsedNumber = number.toString();
        if (number < 100 && group == "3") {
          parsedNumber = parsedNumber.padStart(3, "0");
        } else if (number < 10 && group == "2") {
          parsedNumber = parsedNumber.padStart(2, "0");
        }
        newBlocks.push({
          id: uuidv4(),
          count: count,
          group: group,
          mode: mode,
          number: parsedNumber,
          ticketName: ticketName,
          blockMode: "COUNT",
          createdAt: dayjs()
            .add(newBlocks.length, "second")
            .tz("Asia/Calcutta")
            .format(),
        });
      }
    } else if (option == "111") {
      // validations
      if (Number(start) > Number(end)) {
        return res.status(400).send({ message: "INVALID DATA" });
      }
      for (let number = Number(start); number <= Number(end); number += 111) {
        let parsedNumber = number.toString();
        if (number < 100 && group == "3") {
          parsedNumber = parsedNumber.padStart(3, "0");
        } else if (number < 10 && group == "2") {
          parsedNumber = parsedNumber.padStart(2, "0");
        }
        newBlocks.push({
          id: uuidv4(),
          count: count,
          group: group,
          mode: mode,
          number: parsedNumber,
          ticketName: ticketName,
          blockMode: "COUNT",
          createdAt: dayjs()
            .add(newBlocks.length, "second")
            .tz("Asia/Calcutta")
            .format(),
        });
      }
    }

    // get current blocks
    const docClient = new AWS.DynamoDB.DocumentClient();
    var params1 = {
      TableName: "Blocks-Tirur",
      ExpressionAttributeValues: {
        ":blockMode": "COUNT",
      },
      FilterExpression: "blockMode = :blockMode",
    };

    let dateBlocks;
    let dateBlocksItems = [];
    do {
      dateBlocks = await docClient.scan(params1).promise();
      dateBlocksItems = dateBlocksItems.concat(dateBlocks.Items);
      params1.ExclusiveStartKey = dateBlocks.LastEvaluatedKey;
    } while (typeof dateBlocks.LastEvaluatedKey != "undefined");
    const parsedNewBlocks = newBlocks.filter((item) => {
      const duplicateFlag = dateBlocksItems.findIndex(
        (i) =>
          i.ticketName == item.ticketName &&
          i.mode == item.mode &&
          i.number == item.number &&
          i.group == group
      );
      return duplicateFlag == -1;
    });

    // var params = {
    //   TableName: "Blocks-Tirur",
    //   Item: {
    //     id: uuidv4(),
    //     ticketName,
    //     mode,
    //     blockMode: "COUNT",
    //     count,
    //     group,
    //     number,
    //     createdAt: dayjs().tz("Asia/Calcutta").format(),
    //   },
    // };
    for (const item of parsedNewBlocks) {
      let params = {
        TableName: "Blocks-Tirur",
        Item: item,
      };
      let blockRes = await docClient.put(params).promise();
    }

    return res.status(200).send({
      message: "OK",
    });
  } catch (err) {
    console.error(err);
    res.status(409).send({ err });
  }
};

const editCountBlock = async (req, res) => {
  try {
    let { blockId, ticketName, mode, count, group, number } = req.body;
    const docClient = new AWS.DynamoDB.DocumentClient();
    var params = {
      TableName: "Blocks-Tirur",
      Key: {
        id: blockId,
        ticketName,
      },
      UpdateExpression:
        "set #count = :count, #group = :group, #mode = :mode, #number = :number",
      ExpressionAttributeValues: {
        ":number": number,
        ":count": count,
        ":mode": mode,
        ":group": group,
      },
      ExpressionAttributeNames: {
        "#group": "group",
        "#number": "number",
        "#mode": "mode",
        "#count": "count",
      },
    };
    let blockRes = await docClient.update(params).promise();
    return res.status(200).send({
      message: "OK",
      blockRes,
    });
  } catch (err) {
    console.error(err);
    res.status(409).send({ err });
  }
};

const getUserBlocks = (req, res) => {
  let { userId } = req.query;
  const docClient = new AWS.DynamoDB.DocumentClient();
  var params = {
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
    ProjectionExpression: "createdAt, id, #name, #type, isEntryBlocked",
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

const addUserBlocks = async (req, res) => {
  try {
    let { userId, userType } = req.body;
    let newBlock = JSON.parse(req.body.newBlock);
    newBlock["id"] = uuidv4();
    let userData = await getBasicUserInfo(userId);
    let temp = userData.Items[0].isEntryBlocked;
    let duplicateFlag = temp.findIndex(
      (i) =>
        i.ticketName == newBlock.ticketName &&
        i.mode == newBlock.mode &&
        i.number == newBlock.number &&
        i.group == newBlock.group
    );
    if (duplicateFlag !== -1) {
      // duplicate entry exists
      return res.status(409).send({ message: "Entry exists" });
    }
    let userBlocks = [...temp, newBlock];
    const docClient = new AWS.DynamoDB.DocumentClient();
    var params = {
      TableName: "Users-Tirur",
      Key: {
        id: userId,
        type: userType,
      },
      UpdateExpression: "set isEntryBlocked = :userBlocks",
      //   ExpressionAttributeNames: {
      //     "#name": "name",
      //   },
      ExpressionAttributeValues: {
        ":userBlocks": userBlocks,
      },
      ReturnValues: "UPDATED_NEW",
    };
    let queryRes = await docClient.update(params).promise();
    return res.status(200).send({ message: "OK", userData: queryRes });
  } catch (err) {
    console.log(err);
    return res.status(409).send({ err });
  }
};

const addUserSeriesBlocks = async (req, res) => {
  try {
    const { userId, userType } = req.body;
    const newBlockData = JSON.parse(req.body.newBlock);

    const newBlocks = [];
    const selectedOption = newBlockData.option;

    if (selectedOption == null) {
      newBlocks.push({
        id: uuidv4(),
        count: newBlockData.count,
        group: newBlockData.group,
        mode: newBlockData.mode,
        number: newBlockData.number,
        ticketName: newBlockData.ticketName,
      });
    } else if (selectedOption == "Range") {
      // validations
      if (Number(newBlockData.start) > Number(newBlockData.end)) {
        return res.status(400).send({ message: "INVALID DATA" });
      }
      for (
        let number = Number(newBlockData.start);
        number <= Number(newBlockData.end);
        number++
      ) {
        let parsedNumber = number.toString();
        if (number < 100 && newBlockData.group == "3") {
          parsedNumber = parsedNumber.padStart(3, "0");
        } else if (number < 10 && newBlockData.group == "2") {
          parsedNumber = parsedNumber.padStart(2, "0");
        }
        newBlocks.push({
          id: uuidv4(),
          count: newBlockData.count,
          group: newBlockData.group,
          mode: newBlockData.mode,
          number: parsedNumber,
          ticketName: newBlockData.ticketName,
        });
      }
    } else if (selectedOption == "Set") {
      const permuations = findPermutations(newBlockData.number);
      permuations.forEach((number) => {
        let parsedNumber = number.toString();
        if (number < 100 && newBlockData.group == "3") {
          parsedNumber = parsedNumber.padStart(3, "0");
        } else if (number < 10 && newBlockData.group == "2") {
          parsedNumber = parsedNumber.padStart(2, "0");
        }
        newBlocks.push({
          id: uuidv4(),
          count: newBlockData.count,
          group: newBlockData.group,
          mode: newBlockData.mode,
          number: parsedNumber,
          ticketName: newBlockData.ticketName,
        });
      });
    } else if (selectedOption == "100") {
      // validations
      if (Number(newBlockData.start) > Number(newBlockData.end)) {
        return res.status(400).send({ message: "INVALID DATA" });
      }
      for (
        let number = Number(newBlockData.start);
        number <= Number(newBlockData.end);
        number += 100
      ) {
        let parsedNumber = number.toString();
        if (number < 100 && newBlockData.group == "3") {
          parsedNumber = parsedNumber.padStart(3, "0");
        } else if (number < 10 && newBlockData.group == "2") {
          parsedNumber = parsedNumber.padStart(2, "0");
        }
        newBlocks.push({
          id: uuidv4(),
          count: newBlockData.count,
          group: newBlockData.group,
          mode: newBlockData.mode,
          number: parsedNumber,
          ticketName: newBlockData.ticketName,
        });
      }
    } else if (selectedOption == "111") {
      // validations
      if (Number(newBlockData.start) > Number(newBlockData.end)) {
        return res.status(400).send({ message: "INVALID DATA" });
      }
      for (
        let number = Number(newBlockData.start);
        number <= Number(newBlockData.end);
        number += 111
      ) {
        let parsedNumber = number.toString();
        if (number < 100 && newBlockData.group == "3") {
          parsedNumber = parsedNumber.padStart(3, "0");
        } else if (number < 10 && newBlockData.group == "2") {
          parsedNumber = parsedNumber.padStart(2, "0");
        }
        newBlocks.push({
          id: uuidv4(),
          count: newBlockData.count,
          group: newBlockData.group,
          mode: newBlockData.mode,
          number: parsedNumber,
          ticketName: newBlockData.ticketName,
        });
      }
    }

    // fetch existing block data
    const userData = await getBasicUserInfo(userId);
    const temp = userData.Items[0].isEntryBlocked;
    const parsedNewBlocks = newBlocks.filter((newBlock) => {
      let duplicateFlag = temp.findIndex(
        (i) =>
          i.ticketName == newBlock.ticketName &&
          i.mode == newBlock.mode &&
          i.number == newBlock.number &&
          i.group == newBlock.group
      );
      return duplicateFlag === -1;
    });

    const userBlocks = [...temp, ...parsedNewBlocks];

    // update db
    const docClient = new AWS.DynamoDB.DocumentClient();
    const params = {
      TableName: "Users-Tirur",
      Key: {
        id: userId,
        type: userType,
      },
      UpdateExpression: "set isEntryBlocked = :userBlocks",
      //   ExpressionAttributeNames: {
      //     "#name": "name",
      //   },
      ExpressionAttributeValues: {
        ":userBlocks": userBlocks,
      },
      ReturnValues: "UPDATED_NEW",
    };
    const queryRes = await docClient.update(params).promise();
    return res.status(200).send({ message: "OK", userData: queryRes });
  } catch (err) {
    console.log(err);
    return res.status(409).send({ err });
  }
};

const deleteUserBlock = async (req, res) => {
  try {
    let { userId, userType } = req.body;
    let newBlock = JSON.parse(req.body.newBlock);
    let userData = await getBasicUserInfo(userId);
    let temp = userData.Items[0].isEntryBlocked;
    let newTemp = temp.filter((item) => item.id != newBlock.id);
    //   let userBlocks = [...temp, newBlock];
    //   console.log('temp');
    //   console.log(temp);
    //   console.log('newBlock');
    //   console.log(newBlock);
    const docClient = new AWS.DynamoDB.DocumentClient();
    var params = {
      TableName: "Users-Tirur",
      Key: {
        id: userId,
        type: userType,
      },
      UpdateExpression: "set isEntryBlocked = :userBlocks",
      //   ExpressionAttributeNames: {
      //     "#name": "name",
      //   },
      ExpressionAttributeValues: {
        ":userBlocks": newTemp,
      },
      ReturnValues: "UPDATED_NEW",
    };
    let queryRes = await docClient.update(params).promise();
    return res.status(200).send({ message: "OK" });
  } catch (err) {
    console.log(err);
    return res.status(409).send({ err });
  }
};

const editUserBlock = async (req, res) => {
  try {
    let { userId, userType } = req.body;
    let newBlock = JSON.parse(req.body.newBlock);
    let userData = await getBasicUserInfo(userId);
    let temp = userData.Items[0].isEntryBlocked;
    let newTemp = temp.filter((item) => item.id != newBlock.id);
    newTemp = [...newTemp, newBlock];
    //   let userBlocks = [...temp, newBlock];
    //   console.log('temp');
    //   console.log(temp);
    //   console.log('newBlock');
    //   console.log(newBlock);
    const docClient = new AWS.DynamoDB.DocumentClient();
    var params = {
      TableName: "Users-Tirur",
      Key: {
        id: userId,
        type: userType,
      },
      UpdateExpression: "set isEntryBlocked = :userBlocks",
      //   ExpressionAttributeNames: {
      //     "#name": "name",
      //   },
      ExpressionAttributeValues: {
        ":userBlocks": newTemp,
      },
      ReturnValues: "UPDATED_NEW",
    };
    let queryRes = await docClient.update(params).promise();
    return res.status(200).send({ message: "OK" });
  } catch (err) {
    console.log(err);
    return res.status(409).send({ err });
  }
};

module.exports = {
  getDateBlocks,
  deleteBlock,
  addDateBlock,
  getCountBlocks,
  addCountBlock,
  editCountBlock,
  getUserBlocks,
  addUserBlocks,
  deleteUserBlock,
  editUserBlock,
  addUserSeriesBlocks,
  addSeriesCountBlock,
};
