import { NextResponse } from "next/server";

const fallbackInbox = "john.kuk@gmail.com";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
    };

    const email = body.email?.trim().toLowerCase();

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
      return NextResponse.json(
        { error: "Email sending is not configured yet." },
        { status: 500 }
      );
    }

    const inbox = process.env.BEYONDRESUME_INBOX_EMAIL || fallbackInbox;
    const subject = "Beyond Persona request from " + email;
    const text = [
      "A visitor requested more information about their own Beyond Persona for interviews.",
      "",
      "Email: " + email,
      "",
      "Follow up with them about Beyond Resume interview support."
    ].join("\n");

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + process.env.RESEND_API_KEY
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL,
        to: [inbox],
        subject,
        text,
        reply_to: email
      })
    });

    if (!resendResponse.ok) {
      const failureText = await resendResponse.text();
      return NextResponse.json(
        { error: "Lead email failed: " + (failureText || resendResponse.statusText) },
        { status: 502 }
      );
    }

    return NextResponse.json({
      message: "Thanks. We will follow up with more Beyond Persona information."
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
