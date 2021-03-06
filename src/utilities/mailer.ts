// @ts-ignore uwu
import nodeMailer from "node-mailer";

// ENV stuff
const HOST = process.env.EMAIL_HOST,
  PORT = process.env.EMAIL_PORT,
  USER = process.env.EMAIL_USER,
  PASS = process.env.EMAIL_PASS;

export const mail = (
  to: string,
  subject: string,
  text: string,
  html: string
): Promise<string> => {
  // Emailing settings
  const transporter = nodeMailer.createTransport({
    service: "gmail",
    auth: { USER, PASS },
    tls: {
      rejectUnauthorized: false,
    },
  });

  const mailOptions = {
    from: `"IMPERIAL | Contact" <${USER}>`,
    to,
    subject,
    text,
    html,
  };

  // Return a promise to email the user
  return new Promise<string>((resolve, reject) => {
    transporter.sendMail(mailOptions, async (err: string) => {
      if (err) return reject("An error has occurred whilst emailing");
      resolve("Successfully emailed user!");
    });
  });
};