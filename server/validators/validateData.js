const { DateTime } = require("luxon");

function checkParams(data) {
  const { emailUser, accountNumber, cpfUser } = data;

  if (!emailUser && !accountNumber && !cpfUser) {
    return res.status(400).json({
      success: false,
      message: "Deve informar o: emailUser ou accountNumber ou cpfUser valido!",
    });
  }

  const path = emailUser
    ? "emailUser"
    : accountNumber
    ? "accountNumber"
    : "cpfUser";
  const value = data[path];

  return { path, value };
}

const loterries_Active = ["tenese", "texas", "georgia", "florida", "newyork"];

function periodTimeValid() {
  return DateTime.now()
  .setZone("America/Port-au-Prince")
  .toFormat("yyyy-MM-dd, HH:mm:ss");
}


module.exports = { checkParams, loterries_Active, periodTimeValid };
