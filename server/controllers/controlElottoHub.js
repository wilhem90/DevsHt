const modelElottoHub = require("../models/modelElottoHub.js");
const {
  loterries_Active,
  timeValid,
} = require("../validators/validateData.js");
const idUser = "TyTUiFuNkyCVPMgSC5uL";

const controlElottoHub = {
  // Criar bilhete
  createTicket: async (req, res) => {
    let { values, periodTime, loterrySelected } = req.body;
    loterrySelected = loterrySelected?.toLowerCase();
    periodTime = periodTime?.toLowerCase() || "";

    // Validações de entrada
    if (
      !values ||
      typeof values !== "object" ||
      Object.keys(values).length === 0 || // evitar ticket vazio
      !loterries_Active.includes(loterrySelected) ||
      (periodTime && !["morning", "afternoon"].includes(periodTime))
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid data",
      });
    }

    try {
      const currentTime = timeValid();
      const response = await modelElottoHub.createTicket(
        idUser,
        { values, periodTime, loterrySelected },
        currentTime
      );

      if (!response.success) {
        const status =
          response.message === "Invalid period time"
            ? 400
            : response.message === "These values are not available."
            ? 422
            : response.message === "Insufficient funds"
            ? 402
            : 400;

        return res.status(status).json({
          success: false,
          message: response.message,
          data: response?.outLimits || [],
          periodTime: response?.periodTime || "",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Ticket created successfully",
        periodTime: response.periodTimeValid,
        newSolde: response.newSolde, // saldo atualizado
        totalTicket: response.totalTicket, // valor da aposta
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  },

  // Atualizar bilhete
  updateTicket: async (req, res) => {
    const { idTicket, action, dataTicket } = req.body;
    try {
      if (!idTicket || !action || !["cancel", "update"].includes(action)) {
        return res.status(400).json({
          success: false,
          message: "Invalid data",
        });
      }
      const response = await modelElottoHub.updateTicket(
        idUser,
        idTicket,
        action,
        dataTicket,
        timeValid()
      );

      if (!response.success) {
        return res.status(400).json({
          success: false,
          message: response.message,
        });
      }

      return res.status(200).json({
        success: true,
        message: "Ticket updated successfully",
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  },

  getTickets: async (req, res) => {
    const idUser = rq.user_logged.idUser
    const startDate = req.query.startDate;
    const endDate = req.query.endDate || startDate;
    const tickets = await modelElottoHub.getAllTickets(idUser, );

  }
};

module.exports = controlElottoHub;
