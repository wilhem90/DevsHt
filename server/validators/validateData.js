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

module.exports = { checkParams };
