import { Resend } from "resend"
import { inngest } from "../client"
import { AUTH_USER_CREATED_EVENT } from "../events"

export const AUTH_USER_CREATED_FUNCTION_ID = "auth-user-created"

function requireEnv(name: string) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} is not configured.`)
  }

  return value
}

function buildWelcomeEmail(input: { firstName: string; signInUrl: string }) {
  return {
    subject: "Welcome to Amelia",
    html: `
      <div style="font-family: Poppins, Arial, sans-serif; color: #1f2937; line-height: 1.6;">
        <p>Hello ${input.firstName},</p>
        <p>Welcome to Amelia. Your clinic workspace is ready.</p>
        <p>You can sign in here: <a href="${input.signInUrl}">${input.signInUrl}</a></p>
        <p>We built Amelia to help clinics manage billing, payment collection, and claims workflows with less friction.</p>
      </div>
    `,
  }
}

export const authUserCreated = inngest.createFunction(
  {
    id: AUTH_USER_CREATED_FUNCTION_ID,
    triggers: [{ event: AUTH_USER_CREATED_EVENT }],
  },
  async ({ event, step }) => {
    const resend = new Resend(requireEnv("RESEND_API_KEY"))
    const signInUrl = `${requireEnv("VITE_APP_URL").replace(/\/$/, "")}/sign-in`
    const email = event.data.email

    const welcomeEmail = buildWelcomeEmail({
      firstName: event.data.firstName || "there",
      signInUrl,
    })

    const result = await step.run("send-welcome-email", async () => {
      return await resend.emails.send({
        from: requireEnv("RESEND_FROM_EMAIL"),
        to: email,
        subject: welcomeEmail.subject,
        html: welcomeEmail.html,
      })
    })

    return {
      email,
      sentEmailId: result.data?.id ?? null,
    }
  },
)
