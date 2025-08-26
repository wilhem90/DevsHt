const nodemailer = require("nodemailer");
require("dotenv").config()

// Função para enviar e-mail
async function sendEmail(type, to, data = {}) {
  try {
    if (!emailTemplates[type]) {
      throw new Error("Tipo de e-mail inválido.");
    }

    const { subject, html } = emailTemplates[type](...Object.values(data));

    const info = await transporter.sendMail({
      from: `"BERMAX GLOBAL LTDA" <${process.env.EMAIL_APP}>`,
      to,
      subject,
      html,
    });

    console.log(`📨 [${type}] E-mail enviado para ${to}: ${info.messageId}`);
    return { success: true, id: info.messageId };
  } catch (err) {
    console.error("Erro ao enviar e-mail:", err);
    return { success: false, error: err.message };
  }
}

// Criar transportador com Gmail (use App Password, não a senha normal)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_APP, // seu email
    pass: process.env.PASSWORD_APP, // senha/app password
  },
});

// Templates de e-mail
const emailTemplates = {
  welcome: (name) => ({
    subject: "🎉 Bem-vindo ao sistema!",
    html: `<h1>Olá, ${name}!</h1>
           <p>Seja bem-vindo(a) ao nosso sistema 🚀</p>
           <p>Estamos felizes em ter você com a gente.</p>`,
  }),

  validateEmail: (link) => ({
    subject: "📧 Confirme seu e-mail",
    html: `<h1>Confirmação de E-mail</h1>
           <p>Clique no link abaixo para confirmar seu e-mail:</p>
           <a href="${link}">${link}</a>`,
  }),

  validateDevice: (code) => ({
    subject: "📱 Confirme seu dispositivo",
    html: `<h1>Validação de Aparelho</h1>
           <p>Digite o código abaixo no sistema para confirmar seu aparelho:</p>
           <h2>${code}</h2>`,
  }),

  resetPassword: (link) => ({
    subject: "🔑 Redefinição de Senha",
    html: `<h1>Redefinir Senha</h1>
           <p>Você solicitou a redefinição de senha. Clique abaixo para continuar:</p>
           <a href="${link}">${link}</a>
           <p>Se você não solicitou, ignore este e-mail.</p>`,
  }),

  alert: (message) => ({
    subject: "Certo",
    html: `<h1>Ola amigo!</h1>
           <p>${message}</p>`,
  }),
};

module.exports = sendEmail;
