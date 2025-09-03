const modelElottoHub = require("../models/modelElottoHub");
const {
  loterries_Active,
  periodTimeValid,
} = require("../validators/validateData");

const controlElottoHub = {
  createTicket: async (req, res) => {
    const { values, periodTime, loterry } = req.body;
    const idUser = "TyTUiFuNkyCVPMgSC5uL";
    if (
      !values ||
      typeof values !== "object" ||
      !loterries_Active.includes(loterry.toLowerCase())
      || (periodTime && !["morning", "afternoon"].includes(periodTime.toLowerCase()))
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid data",
      });
    }

    try {
      const validatePeriodTime = periodTimeValid();
      const responseOfTicketSaved = await modelElottoHub.createTicket(
        idUser,
        { values, periodTime, loterry },
        validatePeriodTime
      );

      if (!responseOfTicketSaved.success) {
        return res.status(400).json({
          success: false,
          message: "Invalid data",
          data: responseOfTicketSaved.allValuesOutOfLimit,
        });
      }

      return res.status(200).json({
        success: true,
        message: "Vamos processar a sua transação",
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  },
};

module.exports = controlElottoHub;
