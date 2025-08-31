const nodemailer = require("nodemailer");
require("dotenv").config();

// Function to send email
async function connectAndSendEmail(to, subject, html) {
  try {
    // Check if email service is configured
    if (!process.env.EMAIL_APP || !process.env.PASSWORD_APP) {
      console.warn(
        "Serviço de email não configurado. Verifique as variáveis de ambiente."
      );
      return { success: false, error: "Serviço de email não configurado" };
    }

    // Create transporter with Gmail (use App Password, not normal password)
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_APP, // your email
        pass: process.env.PASSWORD_APP, // password/app password
      },
    });

    // Verify transporter connection on startup
    transporter.verify((error, success) => {
      if (error) {
        console.error("Erro na configuração do email:", error);
      } else {
        console.log("📧 Servidor de email configurado com sucesso");
      }
    });

    // Send email
    const info = await transporter.sendMail({
      from: `"BERMAX GLOBAL LTDA" <${process.env.EMAIL_APP}>`,
      to,
      subject,
      html,
    });

    console.log(`📨 E-mail enviado para ${to}: ${info.messageId}`);
    return { success: true, id: info.messageId };
  } catch (err) {
    console.error("Erro ao enviar e-mail:", err);
    return { success: false, error: err.message };
  }
}

// Helper function to format currency safely
const formatCurrency = (value) => {
  if (value == null || isNaN(value)) {
    return "R$ 0,00";
  }
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
};

// Helper function to format date safely
const formatDate = (date) => {
  if (!date) return new Date().toLocaleString("pt-BR");
  return new Date(date).toLocaleString("pt-BR");
};

// Email templates
const sendEmail = {
  // Bem-vindo
  welcome: async (emailUser, name) => {
    connectAndSendEmail(
      emailUser,
      "🎉 Bem-vindo ao sistema!",
      `<h1>Olá, ${name}!</h1>
      <p>Seja bem-vindo(a) ao nosso sistema 🚀</p>
      <p>Estamos felizes em ter você com a gente.</p>`
    );
  },

  validateEmail: async (emailUser, name, link) => {
    connectAndSendEmail(
      emailUser,
      "📧 Confirme seu e-mail",
      `<h1>Confirmação de E-mail</h1>
      <p>Olá ${name},</p>
      <p>Clique no link abaixo para confirmar seu e-mail:</p>
      <a href="${link}">${link}</a>
      <p>Se você não solicitou este e-mail, por favor ignore.</p>`
    );
  },

  validateDevice: async (emailUser, name, code) => {
    connectAndSendEmail(
      emailUser,
      "📱 Confirme seu dispositivo",
      `<h1>Validação de Aparelho</h1>
      <p>Olá ${name},</p>
      <p>Digite o código abaixo no sistema para confirmar seu aparelho:</p>
      <h2>${code}</h2>
      <p>Este código expira em 15 minutos.</p>`
    );
  },

  resetPassword: async (emailUser, name, link) => {
    connectAndSendEmail(
      emailUser,
      "🔑 Redefinição de Senha",
      `<h1>Redefinir Senha</h1>
      <p>Olá ${name},</p>
      <p>Você solicitou a redefinição de senha. Clique abaixo para continuar:</p>
      <a href="${link}">${link}</a>
      <p>Este link expira em 1 hora.</p>
      <p>Se você não solicitou, ignore este e-mail.</p>`
    );
  },

  alert: async (emailUser, name, message) => {
    connectAndSendEmail(
      emailUser,
      "⚠️ Alerta de segurança!",
      `
    <div style="font-family: Arial, sans-serif; font-size: 15px; color: #333; background-color: #f9f9f9; padding: 20px; border-radius: 10px; line-height: 1.6; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #e74c3c; margin-top: 0;">⚠️ Olá ${name}!</h2>

      <p style="margin: 0 0 10px;">
        ${message}
      </p>

      <p style="margin: 0 0 10px;">
        Entre em contato conosco se precisar de ajuda.
      </p>

      <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">

      <p style="font-size: 13px; color: #777; margin: 0; text-align: center;">
        © ${new Date().getFullYear()} Bermax Global. Todos os direitos reservados.
      </p>
    </div>
    `
    );
  },

  invoice: async (
    emailUser,
    name,
    amount,
    title,
    balanceBefore,
    balanceAfter,
    date,
    transactionId
  ) => {
    connectAndSendEmail(
      emailUser,
      `📄 Comprovante Da Transação`,
      `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
    <h2 style="text-align: center; color: #2c3e50; text-transform: capitalize;">${
      title || "Comprovante de Transação"
    }</h2>
    <p style="text-align: center; color: #27ae60; font-weight: bold;">Operação realizada com sucesso ✅</p>
    
    <p style="text-transform: capitalize;">Olá ${name || "Cliente"},</p>
    <p>Segue o comprovante da sua transação:</p>
    
    <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd;"><strong>Valor</strong></td>
        <td style="padding: 10px; border: 1px solid #ddd;">${formatCurrency(
          amount
        )}</td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd;"><strong>Saldo Anterior</strong></td>
        <td style="padding: 10px; border: 1px solid #ddd;">${formatCurrency(
          balanceBefore
        )}</td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd;"><strong>Novo Saldo</strong></td>
        <td style="padding: 10px; border: 1px solid #ddd;">${formatCurrency(
          balanceAfter
        )}</td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd;"><strong>Data</strong></td>
        <td style="padding: 10px; border: 1px solid #ddd;">${formatDate(
          date
        )}</td>
      </tr>
      ${
        transactionId
          ? `
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd;"><strong>ID da Transação</strong></td>
        <td style="padding: 10px; border: 1px solid #ddd;">${transactionId}</td>
      </tr>
      `
          : ""
      }
    </table>

    <p style="margin-top: 20px; font-size: 14px; color: #7f8c8d;">
      Este é um comprovante eletrônico. Não é necessário respondê-lo.
    </p>

    <p style="text-align: center; font-size: 12px; color: #999;">
      © ${new Date().getFullYear()} BERMAX GLOBAL LTDA
    </p>
  </div>
  `
    );
  },
};

module.exports = sendEmail;
