import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendWelcomeEmail(to: string, name: string) {
  await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to,
    subject: "Welcome to webma",
    html: `<p>Hi ${name || "there"},</p>
           <p>Your webma account is ready — no extra steps needed. Log in and start generating your first site.</p>
           <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/login">Log in</a></p>`,
  });
}

export async function sendPaymentFailedEmail(to: string, name: string) {
  await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to,
    subject: "Your webma payment didn't go through",
    html: `<p>Hi ${name || "there"},</p>
           <p>We couldn't process your last payment. Please update your billing details to avoid losing access to your plan.</p>
           <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing">Update billing</a></p>`,
  });
}
