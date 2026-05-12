const nodemailer = require('nodemailer');

async function sendApplicationEmail({ smtpHost, smtpPort, smtpUser, smtpPass, from, to, subject, html }) {
  if (!smtpHost || !smtpPort || !to) {
    throw new Error('Missing SMTP configuration');
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: Number(smtpPort),
    secure: Number(smtpPort) === 465,
    auth: smtpUser && smtpPass ? { user: smtpUser, pass: smtpPass } : undefined,
  });

  const info = await transporter.sendMail({
    from: from || smtpUser,
    to,
    subject,
    html,
  });

  return info;
}

module.exports = { sendApplicationEmail };
