const isBlockValid = (blockObj, ticket) => {
  let cond1 = false;
  if (blockObj.mode == ticket[4]) {
    cond1 = true;
  } else {
    if (ticket[4] == "SUPER" || ticket[4] == "BOX") {
      cond1 = blockObj.mode == "ALL" && blockObj.group == "3";
    } else if (ticket[4] == "AB" || ticket[4] == "BC" || ticket[4] == "AC") {
      cond1 = blockObj.mode == "ALL" && blockObj.group == "2";
    } else if (ticket[4] == "A" || ticket[4] == "B" || ticket[4] == "C") {
      cond1 = blockObj.mode == "ALL" && blockObj.group == "1";
    }
  }
  let cond2 = blockObj.number == ticket[1] || blockObj.number == "ALL";
  let cond3 = blockObj.ticketName == ticketName || blockObj.ticketName == "ALL";

  return cond1 && cond2 && cond3;
};

const findCount = ({ ticketName, number, mode, counter, userType }) => {
  return agentCount;
};

const ticketEntry = async (req, res) => {
  try {
    let tickets = JSON.parse(req.body.tickets);
    let billNo = null;
    const { ticketName, userType } = req.body;
    console.log(req.body);
    let blockedTickets = [];

    // fetching user data
    let partnerDataPromise = getBasicUserInfo(req.body.partnerId);
    let stockistDataPromise = getBasicUserInfo(req.body.stockistId);
    let subStockistDataPromise = getBasicUserInfo(req.body.subStockistId);
    let agentDataPromise = getBasicUserInfo(req.body.agentId);

    let [partnerData, stockistData, subStockistData, agentData] =
      await Promise.all([
        partnerDataPromise,
        stockistDataPromise,
        subStockistDataPromise,
        agentDataPromise,
      ]);

    // Time lock validation
    var { start, timeLockMessage, end } = findStartTime(ticketName, userType);
    let today = dayjs().tz("Asia/Calcutta");
    const now = today.hour() * 60 + today.minute();

    if (start <= now && now <= end) {
      return res.status(200).send({
        status: "BLOCKED",
        message: timeLockMessage,
      });
    }

    let resultDate;
    if (now < start) {
      // resultDate is currentDate
      resultDate = today.format("YYYY-MM-DD");
    } else {
      // resultDate is today + 1
      resultDate = today.add(1, "day").format("YYYY-MM-DD");
    }

    // BLOCKING STARTS
    // 1) user sales block
    if (partnerData.Items[0].isSalesBlocked) {
      return res.status(200).send({
        status: "BLOCKED",
        message: `Entry blocked for ${partnerData.Items[0].name}`,
      });
    } else if (stockistData.Items[0].isSalesBlocked) {
      return res.status(200).send({
        status: "BLOCKED",
        message: `Entry blocked for ${stockistData.Items[0].name}`,
      });
    } else if (subStockistData.Items[0].isSalesBlocked) {
      return res.status(200).send({
        status: "BLOCKED",
        message: `Entry blocked for ${subStockistData.Items[0].name}`,
      });
    } else if (agentData.Items[0].isSalesBlocked) {
      return res.status(200).send({
        status: "BLOCKED",
        message: `Entry blocked for ${agentData.Items[0].name}`,
      });
    }

    // 2) date block
    let blockDate = await getDateBlocks(ticketName, resultDate);
    if (blockDate.length != 0) {
      // entry blocked for the date
      return res.status(200).send({
        status: "BLOCKED",
        message: `Entry blocked for ${ticketName} on ${resultDate}`,
      });
    }

    let blockedIndexes = [];

    // 3) admin ticket counter blocking
    if (userType != "1" && userType != "2") {
      let blockedData = await getCountBlocks(ticketName);
      // console.log("blockedData", blockedData);
      let PromiseArr = [];
      if (blockedData.Count != 0) {
        // get total count of tickets
        var masterCounter = await getMasterCounter(
          tickets,
          ticketName,
          resultDate
        );
        // console.log("masterCounter", masterCounter);

        // Iterate blocked data
        PromiseArr = blockedData.map(async (blockObj) => {
          let PromiseArr2 = [];
          PromiseArr2 = tickets.map(async (ticket, ticketIndex) => {
            let checkCondition1 = ticket[4] == blockObj.mode;
            let checkCondition2 = false;

            if (ticket[4] == "SUPER" || ticket[4] == "BOX") {
              checkCondition2 = blockObj.mode == "ALL" && blockObj.group == "3";
            } else if (
              ticket[4] == "AB" ||
              ticket[4] == "BC" ||
              ticket[4] == "AC"
            ) {
              checkCondition2 = blockObj.mode == "ALL" && blockObj.group == "2";
            } else if (
              ticket[4] == "A" ||
              ticket[4] == "B" ||
              ticket[4] == "C"
            ) {
              checkCondition2 = blockObj.mode == "ALL" && blockObj.group == "1";
            }

            if (checkCondition1 || checkCondition2) {
              // block mode matching (SUPER, BOX, AB etc)
              // check if number matches
              if (blockObj.number == "ALL" || blockObj.number == ticket[1]) {
                // ticket and block number matching
                if (blockObj.count == 0) {
                  // check if count is Zero - no need to take count
                  blockedTickets.push([
                    ticket[0],
                    ticket[1],
                    0,
                    Number(ticket[2]),
                  ]);
                  blockedIndexes.push(ticketIndex);
                } else {
                  // find counter
                  let counter;
                  // counter for ALL Mode
                  if (blockObj.mode == "ALL") {
                    let tempIndex = masterCounter.findIndex(
                      (item) => item.number == ticket[1]
                    );
                    if (ticket[4] == "SUPER" || ticket[4] == "BOX") {
                      if (ticket[4] == "SUPER") {
                        masterCounter[tempIndex].super =
                          Number(masterCounter[tempIndex].super) +
                          Number(ticket[2]);
                      } else if (ticket[4] == "BOX") {
                        masterCounter[tempIndex].box =
                          Number(masterCounter[tempIndex].box) +
                          Number(ticket[2]);
                      }
                      counter =
                        Number(masterCounter[tempIndex].super) +
                        Number(masterCounter[tempIndex].box);
                    } else if (
                      ticket[4] == "AB" ||
                      ticket[4] == "BC" ||
                      ticket[4] == "AC"
                    ) {
                      if (ticket[4] == "AB") {
                        masterCounter[tempIndex].ab =
                          Number(masterCounter[tempIndex].ab) +
                          Number(ticket[2]);
                      } else if (ticket[4] == "BC") {
                        masterCounter[tempIndex].bc =
                          Number(masterCounter[tempIndex].bc) +
                          Number(ticket[2]);
                      } else if (ticket[4] == "AC") {
                        masterCounter[tempIndex].ac =
                          Number(masterCounter[tempIndex].ac) +
                          Number(ticket[2]);
                      }
                      counter =
                        Number(masterCounter[tempIndex].ab) +
                        Number(masterCounter[tempIndex].bc) +
                        Number(masterCounter[tempIndex].ac);
                    } else if (
                      ticket[4] == "A" ||
                      ticket[4] == "B" ||
                      ticket[4] == "C"
                    ) {
                      if (ticket[4] == "A") {
                        masterCounter[tempIndex].a =
                          Number(masterCounter[tempIndex].a) +
                          Number(ticket[2]);
                      } else if (ticket[4] == "B") {
                        masterCounter[tempIndex].b =
                          Number(masterCounter[tempIndex].b) +
                          Number(ticket[2]);
                      } else if (ticket[4] == "C") {
                        masterCounter[tempIndex].c =
                          Number(masterCounter[tempIndex].c) +
                          Number(ticket[2]);
                      }
                      counter =
                        Number(masterCounter[tempIndex].a) +
                        Number(masterCounter[tempIndex].b) +
                        Number(masterCounter[tempIndex].c);
                    }
                  } else {
                    // counter for NOT ALL Mode
                    if (ticket[4] == "SUPER") {
                      let tempIndex = masterCounter.findIndex(
                        (item) => item.number == ticket[1]
                      );
                      masterCounter[tempIndex].super =
                        Number(masterCounter[tempIndex].super) +
                        Number(ticket[2]);
                      counter = masterCounter[tempIndex].super;
                    } else if (ticket[4] == "BOX") {
                      let tempIndex = masterCounter.findIndex(
                        (item) => item.number == ticket[1]
                      );
                      masterCounter[tempIndex].box =
                        Number(masterCounter[tempIndex].box) +
                        Number(ticket[2]);
                      counter = masterCounter[tempIndex].box;
                    } else if (ticket[4] == "AB") {
                      let tempIndex = masterCounter.findIndex(
                        (item) => item.number == ticket[1]
                      );
                      masterCounter[tempIndex].ab =
                        Number(masterCounter[tempIndex].ab) + Number(ticket[2]);
                      counter = masterCounter[tempIndex].ab;
                    } else if (ticket[4] == "BC") {
                      let tempIndex = masterCounter.findIndex(
                        (item) => item.number == ticket[1]
                      );
                      masterCounter[tempIndex].bc =
                        Number(masterCounter[tempIndex].bc) + Number(ticket[2]);
                      counter = masterCounter[tempIndex].bc;
                    } else if (ticket[4] == "AC") {
                      let tempIndex = masterCounter.findIndex(
                        (item) => item.number == ticket[1]
                      );
                      masterCounter[tempIndex].ac =
                        Number(masterCounter[tempIndex].ac) + Number(ticket[2]);
                      counter = masterCounter[tempIndex].ac;
                    } else if (ticket[4] == "A") {
                      let tempIndex = masterCounter.findIndex(
                        (item) => item.number == ticket[1]
                      );
                      masterCounter[tempIndex].a =
                        Number(masterCounter[tempIndex].a) + Number(ticket[2]);
                      counter = masterCounter[tempIndex].a;
                    } else if (ticket[4] == "B") {
                      let tempIndex = masterCounter.findIndex(
                        (item) => item.number == ticket[1]
                      );
                      masterCounter[tempIndex].b =
                        Number(masterCounter[tempIndex].b) + Number(ticket[2]);
                      counter = masterCounter[tempIndex].b;
                    } else if (ticket[4] == "C") {
                      let tempIndex = masterCounter.findIndex(
                        (item) => item.number == ticket[1]
                      );
                      masterCounter[tempIndex].c =
                        Number(masterCounter[tempIndex].c) + Number(ticket[2]);
                      counter = masterCounter[tempIndex].c;
                    }
                  }

                  // check if counter > blockCount

                  if (counter > Number(blockObj.count)) {
                    blockMessage = `Entry blocked for number ${ticket[1]} on ${ticketName}-${ticket[4]}`;
                    let blockedTicket = [...ticket];
                    blockedTicket[2] = counter - Number(blockObj.count);
                    blockedTickets.push([
                      blockedTicket[0],
                      blockedTicket[1],
                      blockedTicket[2],
                      ticket[2],
                    ]);
                    blockedIndexes.push(ticketIndex);
                  }
                }
              }
            }
          });
          const array22 = await Promise.all(PromiseArr2);
        });
      }
      const array12 = await Promise.all(PromiseArr);
    }

    // remove blockedTickets from tickets
    let ticketsCopy = [];
    tickets.forEach((ticket, index1) => {
      if (blockedIndexes.findIndex((item) => item == index1) == -1) {
        ticketsCopy.push(ticket);
      }
    });

    // 4) stockist / substockist / agent ticket counter block
    if (userType != "1" && userType != "2") {
      blockedIndexes = [];
      let partnerBlockList = partnerData.Items[0].isEntryBlocked.filter(
        (i) => i.ticketName == ticketName || i.ticketName == "ALL"
      );
      let stockistBlockList = stockistData.Items[0].isEntryBlocked.filter(
        (i) => i.ticketName == ticketName || i.ticketName == "ALL"
      );
      // console.log("stockistBlockList", stockistBlockList);
      let subStockistBlockList = subStockistData.Items[0].isEntryBlocked.filter(
        (i) => i.ticketName == ticketName || i.ticketName == "ALL"
      );
      let agentBlockList = agentData.Items[0].isEntryBlocked.filter(
        (i) => i.ticketName == ticketName || i.ticketName == "ALL"
      );

      console.log({ tickets });

      let partnerCounterPromise = getUserCounterV2(
        tickets,
        ticketName,
        resultDate,
        req.body.partnerId,
        "2"
      );
      let stockistCounterPromise = getUserCounterV2(
        tickets,
        ticketName,
        resultDate,
        req.body.stockistId,
        "3"
      );
      let subStockistCounterPromise = getUserCounterV2(
        tickets,
        ticketName,
        resultDate,
        req.body.subStockistId,
        "4"
      );
      let agentCounterPromise = getUserCounterV2(
        tickets,
        ticketName,
        resultDate,
        req.body.agentId,
        "5"
      );

      const [
        partnerCounter,
        stockistCounter,
        subStockistCounter,
        agentCounter,
      ] = await Promise.all([
        partnerCounterPromise,
        stockistCounterPromise,
        subStockistCounterPromise,
        agentCounterPromise,
      ]);
      // console.log("stockistCounter", stockistCounter);

      let PromiseArr3 = [
        agentBlockList,
        subStockistBlockList,
        stockistBlockList,
        partnerBlockList,
      ].map(async (blockList, index) => {
        let targetCounter;
        switch (index) {
          case 0:
            targetCounter = agentCounter;
            break;
          case 1:
            targetCounter = subStockistCounter;
            break;
          case 2:
            targetCounter = stockistCounter;
            break;
          case 3:
            targetCounter = partnerCounter;
            break;
          default:
            targetCounter = agentCounter;
            break;
        }
        let PromiseArr = blockList.map(async (blockObj) => {
          let PromiseArr2 = ticketsCopy.map(async (ticket, ticketIndex) => {
            let checkCondition1 = ticket[4] == blockObj.mode;
            let checkCondition2 = false;

            if (ticket[4] == "SUPER" || ticket[4] == "BOX") {
              checkCondition2 = blockObj.mode == "ALL" && blockObj.group == "3";
            } else if (
              ticket[4] == "AB" ||
              ticket[4] == "BC" ||
              ticket[4] == "AC"
            ) {
              checkCondition2 = blockObj.mode == "ALL" && blockObj.group == "2";
            } else if (
              ticket[4] == "A" ||
              ticket[4] == "B" ||
              ticket[4] == "C"
            ) {
              checkCondition2 = blockObj.mode == "ALL" && blockObj.group == "1";
            }

            if (checkCondition1 || checkCondition2) {
              // block mode matching (SUPER, BOX, AB etc)
              // check if number matches
              if (blockObj.number == "ALL" || blockObj.number == ticket[1]) {
                // ticket and block number matching
                if (blockObj.count == 0) {
                  // check if count is Zero - no need to take count
                  blockedTickets.push([
                    ticket[0],
                    ticket[1],
                    0,
                    Number(ticket[2]),
                  ]);
                  blockedIndexes.push(ticketIndex);
                } else {
                  // find counter STARTS
                  let counter = 0;
                  // counter for ALL
                  if (blockObj.mode == "ALL") {
                    let tempIndex = targetCounter.findIndex(
                      (item) => item.number == ticket[1]
                    );
                    if (ticket[4] == "SUPER" || ticket[4] == "BOX") {
                      if (ticket[4] == "SUPER") {
                        targetCounter[tempIndex].SUPER =
                          Number(targetCounter[tempIndex].SUPER) +
                          Number(ticket[2]);
                      } else if (ticket[4] == "BOX") {
                        targetCounter[tempIndex].BOX =
                          Number(targetCounter[tempIndex].BOX) +
                          Number(ticket[2]);
                      }
                      counter =
                        Number(targetCounter[tempIndex].SUPER) +
                        Number(targetCounter[tempIndex].BOX);
                    } else if (
                      ticket[4] == "AB" ||
                      ticket[4] == "BC" ||
                      ticket[4] == "AC"
                    ) {
                      if (ticket[4] == "AB") {
                        targetCounter[tempIndex].AB =
                          Number(targetCounter[tempIndex].AB) +
                          Number(ticket[2]);
                      } else if (ticket[4] == "BC") {
                        targetCounter[tempIndex].BC =
                          Number(targetCounter[tempIndex].BC) +
                          Number(ticket[2]);
                      } else if (ticket[4] == "AC") {
                        targetCounter[tempIndex].AC =
                          Number(targetCounter[tempIndex].AC) +
                          Number(ticket[2]);
                      }
                      counter =
                        Number(targetCounter[tempIndex].AB) +
                        Number(targetCounter[tempIndex].BC) +
                        Number(targetCounter[tempIndex].AC);
                    } else if (
                      ticket[4] == "A" ||
                      ticket[4] == "B" ||
                      ticket[4] == "C"
                    ) {
                      if (ticket[4] == "A") {
                        targetCounter[tempIndex].A =
                          Number(targetCounter[tempIndex].A) +
                          Number(ticket[2]);
                      } else if (ticket[4] == "B") {
                        targetCounter[tempIndex].B =
                          Number(targetCounter[tempIndex].B) +
                          Number(ticket[2]);
                      } else if (ticket[4] == "C") {
                        targetCounter[tempIndex].C =
                          Number(targetCounter[tempIndex].C) +
                          Number(ticket[2]);
                      }
                      counter =
                        Number(targetCounter[tempIndex].A) +
                        Number(targetCounter[tempIndex].B) +
                        Number(targetCounter[tempIndex].C);
                    }
                  } else {
                    // counter for NOT ALL Mode
                    if (ticket[4] == "SUPER") {
                      let tempIndex = targetCounter.findIndex(
                        (item) => item.number == ticket[1]
                      );
                      console.log("tempIndex", tempIndex);
                      targetCounter[tempIndex].SUPER =
                        Number(targetCounter[tempIndex].SUPER) +
                        Number(ticket[2]);
                      counter = targetCounter[tempIndex].SUPER;
                      console.log("point 1", counter);
                      console.log(targetCounter[tempIndex].SUPER);
                      console.log(ticket[2]);
                    } else if (ticket[4] == "BOX") {
                      let tempIndex = targetCounter.findIndex(
                        (item) => item.number == ticket[1]
                      );
                      targetCounter[tempIndex].BOX =
                        Number(targetCounter[tempIndex].BOX) +
                        Number(ticket[2]);
                      counter = targetCounter[tempIndex].BOX;
                    } else if (ticket[4] == "AB") {
                      let tempIndex = targetCounter.findIndex(
                        (item) => item.number == ticket[1]
                      );
                      targetCounter[tempIndex].AB =
                        Number(targetCounter[tempIndex].AB) + Number(ticket[2]);
                      counter = targetCounter[tempIndex].AB;
                    } else if (ticket[4] == "BC") {
                      let tempIndex = targetCounter.findIndex(
                        (item) => item.number == ticket[1]
                      );
                      targetCounter[tempIndex].BC =
                        Number(targetCounter[tempIndex].BC) + Number(ticket[2]);
                      counter = targetCounter[tempIndex].CB;
                    } else if (ticket[4] == "AC") {
                      let tempIndex = targetCounter.findIndex(
                        (item) => item.number == ticket[1]
                      );
                      targetCounter[tempIndex].AC =
                        Number(targetCounter[tempIndex].AC) + Number(ticket[2]);
                      counter = targetCounter[tempIndex].AC;
                    } else if (ticket[4] == "A") {
                      let tempIndex = targetCounter.findIndex(
                        (item) => item.number == ticket[1]
                      );
                      targetCounter[tempIndex].A =
                        Number(targetCounter[tempIndex].A) + Number(ticket[2]);
                      counter = targetCounter[tempIndex].A;
                    } else if (ticket[4] == "B") {
                      let tempIndex = targetCounter.findIndex(
                        (item) => item.number == ticket[1]
                      );
                      targetCounter[tempIndex].B =
                        Number(targetCounter[tempIndex].B) + Number(ticket[2]);
                      counter = targetCounter[tempIndex].B;
                    } else if (ticket[4] == "C") {
                      let tempIndex = targetCounter.findIndex(
                        (item) => item.number == ticket[1]
                      );
                      targetCounter[tempIndex].C =
                        Number(targetCounter[tempIndex].C) + Number(ticket[2]);
                      counter = targetCounter[tempIndex].C;
                    }
                  }
                  // find counter ENDS

                  // check if counter > blockCount
                  console.log("final count after user block", counter);
                  console.log("blockObj.count -> user block", blockObj.count);

                  if (counter > Number(blockObj.count)) {
                    // console.log("hey");
                    // console.log("counter");
                    // console.log(counter);
                    // console.log("blockObj.count");
                    // console.log(blockObj.count);
                    let blockedTicket = [...ticket];
                    blockedTicket[2] = counter - Number(blockObj.count);
                    blockedTickets.push([
                      blockedTicket[0],
                      blockedTicket[1],
                      blockedTicket[2],
                      ticket[2],
                    ]);
                    blockedIndexes.push(ticketIndex);
                  }
                }
              }
            }
          });
          const array31 = await Promise.all(PromiseArr2);
        });
        const array32 = await Promise.all(PromiseArr);
      });
      const array33 = await Promise.all(PromiseArr3);
      // superadmin check ends
    }

    console.log("blockedTickets", blockedTickets);
    console.log("blockedIndexes", blockedIndexes);

    // remove blockedTickets from tickets
    let ticketsCopy2 = [];
    ticketsCopy.forEach((ticket, index1) => {
      if (blockedIndexes.findIndex((item) => item == index1) == -1) {
        ticketsCopy2.push(ticket);
      }
    });

    // if tickets is empty, return
    if (ticketsCopy2.length == 0) {
      // parse blockedTickets to remove duplicate values
      const parsedBlockedTickets = [];
      blockedTickets.forEach((item1) => {
        let flag = true;
        parsedBlockedTickets.forEach((item2) => {
          if (item1[0] === item2[0] && item1[1] === item2[1]) {
            flag = false;
          }
        });
        if (flag) {
          parsedBlockedTickets.push(item1);
        }
      });
      return res.status(200).send({
        status: "OK",
        billNo: null,
        message: "No tickets to enter",
        blockedTickets: parsedBlockedTickets,
      });
    }

    // TICKETS ENTRY
    let query1 = `INSERT INTO new_schema.bills (agentId, agentScheme, enteredBy, partnerId, partnerScheme, resultDate, stockistId, stockistScheme, subStockistId, subStockistScheme, ticketName, createdAt) `;
    query1 =
      query1 +
      `VALUES ('${req.body.agentId}', '${req.body.agentScheme}', '${
        req.body.enteredBy
      }', '${req.body.partnerId}', '${
        req.body.partnerScheme
      }', '${resultDate}', '${req.body.stockistId}', '${
        req.body.stockistScheme
      }', '${req.body.subStockistId}', '${
        req.body.subStockistScheme
      }', '${ticketName}', '${today.format("YYYY-MM-DD HH-mm-ss", {
        timeZone: "Asia/Calcutta",
      })}' )`;
    const connection = await mysql.createConnection(config.dbPoolConf);
    await connection.query("START TRANSACTION");
    const [response, meta] = await connection.query(query1);
    billNo = response.insertId;
    // let temp = [["DEAR8-BOX", "512", 10, "100", "BOX", 10(a), 10(ss), 8(s), 7.75 (partner), 7.75 (admin)],["DEAR8-SUPER", "256", 10, "100", "BOX", 10, 10, 7.75, 7.75]]
    let ticketsToEnter = [];
    // TODO get ticketprice from DB
    ticketsCopy2.forEach((item, index) => {
      ticketsToEnter.push([
        response.insertId, // bill no
        item[9], // admin price
        item[5], // agent price
        item[2], // count
        item[4], // mode
        item[1], // number
        item[8], // partnerprice
        item[7], // stockist price
        item[6], // sub stockist price
      ]);
    });
    let query2 = `INSERT INTO new_schema.tickets(billNo, adminPrice, agentPrice, count, mode, number, partnerPrice, stockistPrice, subStockistPrice) VALUES ?`;
    const [response2, meta2] = await connection.query(query2, [ticketsToEnter]);
    await connection.commit();
    // await connection.release();
    await connection.end();

    // parse blockedTickets to remove duplicate values
    const parsedBlockedTickets = [];
    blockedTickets.forEach((item1) => {
      let flag = true;
      parsedBlockedTickets.forEach((item2) => {
        if (item1[0] === item2[0] && item1[1] === item2[1]) {
          flag = false;
        }
      });
      if (flag) {
        parsedBlockedTickets.push(item1);
      }
    });

    return res.status(200).send({
      status: "OK",
      billNo,
      message: "OK",
      blockedTickets: parsedBlockedTickets,
    });
  } catch (error) {
    console.log("error");
    console.log(error);
    return res.status(409).send({ error });
  }
};
