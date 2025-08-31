require("dotenv").config();
async function requestDing(url, method = "GET", data = null) {
  const baseURL = "https://api.dingconnect.com/api/V1/";

  try {
    const options = {
      method,
      headers: {
        API_KEY: process.env.API_KEY_DING,
      },
    };

    if (method === "POST") {
      options.headers["Content-Type"] = "application/json";
      if (data) options.body = JSON.stringify(data);
    }

    const response = await fetch(baseURL + url, options);

    // Caso dê erro na resposta da API
    if (!response.ok) {
      const errorText = await response.text(); // pega mensagem original da API
      return {
        success: false,
        message: `Erro na API DingConnect: ${response.status} - ${errorText}`,
      };
    }

    const data_topup = await response.json();
    console.log(data_topup);
    
    return {
      success: true,
      ...data_topup,
    };
  } catch (error) {
    console.error("Erro em requestDing:", error.message);
    return {
      success: false,
      message: "Falha ao se comunicar com o DingConnect.",
    };
  }
}

module.exports = { requestDing };
