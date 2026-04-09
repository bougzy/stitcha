import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Designer } from "@/lib/models/designer";
import { Client } from "@/lib/models/client";
import { Order } from "@/lib/models/order";

/**
 * WhatsApp Bot Webhook
 *
 * Handles incoming messages from the WhatsApp Business Cloud API (Meta - free).
 * NO Twilio or paid service needed.
 *
 * Setup (free):
 * 1. Create a Meta Developer account at developers.facebook.com
 * 2. Create a WhatsApp Business app (free)
 * 3. Set webhook URL to: https://yourdomain.com/api/whatsapp-bot
 * 4. Set WHATSAPP_VERIFY_TOKEN in your .env
 * 5. Your WhatsApp number is the bot number
 *
 * Designers can control Stitcha entirely from WhatsApp without opening a browser.
 *
 * Supported commands (case-insensitive):
 *
 *   ADD CLIENT [name] [phone] [male|female]
 *     → Creates a new client
 *     → "add client Amaka 08012345678 female"
 *
 *   NEW ORDER [client-name] [title] [price] [due-date?]
 *     → Creates a new order
 *     → "new order Amaka Ankara gown 45000 15/03"
 *
 *   ORDERS
 *     → Lists all active orders with status
 *
 *   UNPAID
 *     → Lists all orders with outstanding balance
 *
 *   REMIND [client-name]
 *     → Generates a payment reminder WhatsApp link for the client
 *
 *   MEASUREMENTS [client-name]
 *     → Returns the client's measurements formatted for WhatsApp
 *
 *   CLIENTS
 *     → Lists all clients
 *
 *   HELP
 *     → Lists all commands
 *
 * The bot identifies the designer by their registered phone number.
 */

/* -------------------------------------------------------------------------- */
/*  Phone normalisation                                                        */
/* -------------------------------------------------------------------------- */

function normalisePhone(phone: string): string {
  let p = phone.replace(/[\s\-().+]/g, "");
  if (p.startsWith("234")) p = "0" + p.slice(3);
  if (!p.startsWith("0"))  p = "0" + p;
  return p;
}

/* -------------------------------------------------------------------------- */
/*  Response helpers                                                           */
/* -------------------------------------------------------------------------- */

function botReply(message: string) {
  return NextResponse.json({ reply: message, success: true });
}

function formatNaira(n: number) {
  return `₦${n.toLocaleString("en-NG")}`;
}

/* -------------------------------------------------------------------------- */
/*  Command handlers                                                           */
/* -------------------------------------------------------------------------- */

async function handleHelp() {
  return botReply(
    `*Stitcha Bot Commands* 🧵\n\n` +
    `*CLIENTS* — list all clients\n` +
    `*ADD CLIENT [name] [phone] [male/female]* — add a new client\n\n` +
    `*ORDERS* — list active orders\n` +
    `*UNPAID* — list unpaid / partial orders\n` +
    `*NEW ORDER [client] [title] [price]* — create an order\n\n` +
    `*MEASUREMENTS [client-name]* — view a client's measurements\n` +
    `*REMIND [client-name]* — send payment reminder link\n\n` +
    `Reply with any command above. Names are not case-sensitive.`
  );
}

async function handleClients(designerId: string) {
  const clients = await Client.find({ designerId }).sort({ name: 1 }).limit(20).lean();
  if (!clients.length) return botReply("You have no clients yet. Reply ADD CLIENT [name] [phone] [male/female] to add your first one.");
  const lines = clients.map((c, i) => `${i + 1}. ${(c as any).name} — ${(c as any).phone}`);
  return botReply(`*Your Clients* (${clients.length})\n\n${lines.join("\n")}`);
}

async function handleOrders(designerId: string) {
  const orders = await Order.find({
    designerId,
    status: { $nin: ["delivered", "cancelled"] },
    isDeleted: { $ne: true },
  })
    .sort({ dueDate: 1 })
    .limit(20)
    .lean();

  if (!orders.length) return botReply("No active orders right now.");

  const lines = orders.map((o: any) => {
    const due = o.dueDate
      ? ` | Due ${new Date(o.dueDate).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}`
      : "";
    return `• ${o.title} — ${o.status.toUpperCase()}${due}`;
  });

  return botReply(`*Active Orders* (${orders.length})\n\n${lines.join("\n")}`);
}

async function handleUnpaid(designerId: string) {
  const orders = await Order.find({
    designerId,
    paymentStatus: { $in: ["unpaid", "partial"] },
    isDeleted: { $ne: true },
  })
    .populate("clientId", "name phone")
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  if (!orders.length) return botReply("🎉 No unpaid orders! All balances are settled.");

  const lines = orders.map((o: any) => {
    const client = o.clientId as any;
    const balance = o.price - (o.depositPaid || 0) - (o.payments?.reduce((s: number, p: any) => s + p.amount, 0) || 0);
    const daysAgo = Math.floor((Date.now() - new Date(o.createdAt).getTime()) / 86400000);
    return `• ${client?.name || "Unknown"}: ${formatNaira(Math.max(0, balance))} owed | ${o.title} | ${daysAgo}d ago`;
  });

  return botReply(`*Unpaid Orders* (${orders.length})\n\n${lines.join("\n")}\n\nReply REMIND [client-name] to send a chase message.`);
}

async function handleAddClient(designerId: string, parts: string[]) {
  // ADD CLIENT [name] [phone] [gender]
  // parts[2] onwards is the name, then phone, then gender
  if (parts.length < 5) {
    return botReply("Format: ADD CLIENT [name] [phone] [male/female]\nExample: add client Amaka Obi 08012345678 female");
  }

  const gender = parts[parts.length - 1].toLowerCase();
  const phone  = parts[parts.length - 2];
  const name   = parts.slice(2, parts.length - 2).join(" ");

  if (!["male", "female"].includes(gender)) {
    return botReply("Please specify male or female at the end.\nExample: add client Amaka 08012345678 female");
  }
  if (!/^\d{10,14}$/.test(phone.replace(/\D/g, ""))) {
    return botReply("That phone number doesn't look right. Please use a Nigerian number like 08012345678.");
  }

  const existing = await Client.findOne({ designerId, name: new RegExp(`^${name}$`, "i") });
  if (existing) return botReply(`A client named ${name} already exists. Use a different name if this is a different person.`);

  await Client.create({ designerId, name: name.trim(), phone: phone.trim(), gender });
  return botReply(`✅ *${name}* added as a client!\n\nNow you can:\n• MEASUREMENTS ${name} — add their measurements\n• NEW ORDER ${name} [title] [price] — create an order`);
}

async function handleMeasurements(designerId: string, parts: string[]) {
  const clientName = parts.slice(1).join(" ");
  if (!clientName) return botReply("Format: MEASUREMENTS [client-name]\nExample: measurements Amaka");

  const client = await Client.findOne({
    designerId,
    name: new RegExp(clientName, "i"),
  }).lean() as any;

  if (!client) return botReply(`No client found matching "${clientName}". Reply CLIENTS to see all your clients.`);
  if (!client.measurements) return botReply(`${client.name} has no measurements yet. Open the Stitcha app to add or scan measurements.`);

  const m = client.measurements;
  const lines: string[] = [`*${client.name}'s Measurements*\n`];

  const fieldMap: Record<string, string> = {
    bust: "Bust", waist: "Waist", hips: "Hips", shoulder: "Shoulder",
    armLength: "Arm Length", sleeveLength: "Sleeve", backLength: "Back Length",
    frontLength: "Front Length", neck: "Neck", chest: "Chest",
    thigh: "Thigh", knee: "Knee", inseam: "Inseam", wrist: "Wrist",
    ankle: "Ankle", calf: "Calf", height: "Height", weight: "Weight (kg)",
    underBust: "Under Bust", roundArm: "Round Arm", blouseLength: "Blouse Length",
    fullLength: "Full Length", halfLength: "Half Length", halfSleeve: "Half Sleeve",
    crotchLength: "Crotch Length",
  };

  for (const [key, label] of Object.entries(fieldMap)) {
    const val = m[key];
    if (typeof val === "number" && val > 0) {
      const inches = (val / 2.54).toFixed(1);
      lines.push(`${label}: ${inches}" (${val.toFixed(1)} cm)`);
    }
  }

  const source = m.source === "ai_scan" ? "AI Scan" : "Manual";
  const date   = m.measuredAt ? new Date(m.measuredAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }) : "";
  lines.push(`\n_Source: ${source}${date ? ` · ${date}` : ""}_`);

  return botReply(lines.join("\n"));
}

async function handleNewOrder(designerId: string, parts: string[]) {
  // NEW ORDER [client-name] [title] [price]
  if (parts.length < 5) {
    return botReply("Format: NEW ORDER [client-name] [title] [price]\nExample: new order Amaka Ankara gown 45000");
  }

  // Last part is price, second-to-last onwards (until we find the client) is title
  const priceStr = parts[parts.length - 1].replace(/[₦,]/g, "");
  const price    = parseFloat(priceStr);
  if (isNaN(price) || price <= 0) {
    return botReply("The last part should be the price in Naira.\nExample: new order Amaka Ankara gown 45000");
  }

  // Find client — try matching first word as client name first, then two words
  let client: any = null;
  let titleParts: string[] = [];

  for (let nameLen = 3; nameLen <= parts.length - 3; nameLen++) {
    const candidateName = parts.slice(2, nameLen).join(" ");
    client = await Client.findOne({ designerId, name: new RegExp(candidateName, "i") }).lean();
    if (client) {
      titleParts = parts.slice(nameLen, parts.length - 1);
      break;
    }
  }

  if (!client) {
    return botReply(`Could not find a client matching your message. Reply CLIENTS to see your client names, then try again.\n\nFormat: NEW ORDER [exact-client-name] [title] [price]`);
  }

  const title = titleParts.join(" ") || "New Order";

  const order = await Order.create({
    designerId,
    clientId:    client._id,
    title:       title.trim(),
    garmentType: "other",
    price,
    depositPaid: 0,
    status:      "pending",
    paymentStatus: "unpaid",
    currency:    "NGN",
  });

  return botReply(
    `✅ *New order created!*\n\n` +
    `Client: ${(client as any).name}\n` +
    `Order: ${title}\n` +
    `Price: ${formatNaira(price)}\n\n` +
    `Open the Stitcha app to add due dates, fabric details, and track progress.`
  );
}

async function handleRemind(designerId: string, designer: any, parts: string[]) {
  const clientName = parts.slice(1).join(" ");
  if (!clientName) return botReply("Format: REMIND [client-name]\nExample: remind Amaka");

  const client = await Client.findOne({ designerId, name: new RegExp(clientName, "i") }).lean() as any;
  if (!client) return botReply(`No client found matching "${clientName}". Reply CLIENTS to see your clients.`);

  const orders = await Order.find({
    designerId,
    clientId:      client._id,
    paymentStatus: { $in: ["unpaid", "partial"] },
    isDeleted:     { $ne: true },
  }).lean();

  if (!orders.length) return botReply(`${client.name} has no outstanding balance. All paid up! ✅`);

  const totalOwed = orders.reduce((sum: number, o: any) => {
    const paid = (o.depositPaid || 0) + (o.payments?.reduce((s: number, p: any) => s + p.amount, 0) || 0);
    return sum + Math.max(0, o.price - paid);
  }, 0);

  const orderList = orders.map((o: any) => `- ${o.title}`).join("\n");
  const message = encodeURIComponent(
    `Hi ${client.name},\n\nThis is a friendly reminder about your outstanding balance of *${formatNaira(totalOwed)}* for:\n${orderList}\n\nPlease make payment at your earliest convenience. Thank you! 🙏\n\n— ${designer.businessName}`
  );

  const clientPhone = normalisePhone(client.phone);
  const waLink      = `https://wa.me/${clientPhone}?text=${message}`;

  return botReply(
    `Payment reminder for *${client.name}*\nTotal owed: ${formatNaira(totalOwed)}\n\nClick to send:\n${waLink}`
  );
}

/* -------------------------------------------------------------------------- */
/*  Main webhook handler                                                       */
/* -------------------------------------------------------------------------- */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Support Meta WhatsApp Cloud API format
    // Meta sends: body.entry[0].changes[0].value.messages[0]
    let fromPhone = "";
    let msgBody   = "";

    // Meta Cloud API format
    if (body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
      const msg  = body.entry[0].changes[0].value.messages[0];
      fromPhone  = msg.from || "";
      msgBody    = msg.text?.body || msg.interactive?.button_reply?.title || "";
    }
    // Fallback: simple direct POST format (for testing)
    else if (body.from || body.From) {
      fromPhone = (body.From || body.from || "").replace(/^whatsapp:/i, "").trim();
      msgBody   = (body.Body || body.body || body.message || "").trim();
    }

    if (!fromPhone || !msgBody) {
      return NextResponse.json({ success: false, error: "Missing from or body" }, { status: 400 });
    }

    await connectDB();

    // Identify designer by phone number
    const normPhone = normalisePhone(fromPhone);
    const designer  = await Designer.findOne({
      phone: new RegExp(normPhone.replace(/^0/, "(0|234)"), "i"),
    }).lean() as any;

    if (!designer) {
      return botReply(
        `Hi! I don't recognise this number.\n\nTo use the Stitcha bot, make sure your WhatsApp number matches the phone number on your Stitcha account.\n\nVisit stitcha.com.ng to sign up or update your phone number.`
      );
    }

    const designerId = designer._id.toString();
    const parts      = msgBody.trim().toLowerCase().split(/\s+/);
    const cmd        = parts[0];
    const cmd2       = parts[1] || "";

    // Route commands
    if (cmd === "help" || cmd === "hi" || cmd === "hello" || cmd === "start") {
      return handleHelp();
    }
    if (cmd === "clients") {
      return handleClients(designerId);
    }
    if (cmd === "orders") {
      return handleOrders(designerId);
    }
    if (cmd === "unpaid" || cmd === "balance" || cmd === "debts") {
      return handleUnpaid(designerId);
    }
    if (cmd === "add" && cmd2 === "client") {
      return handleAddClient(designerId, parts);
    }
    if (cmd === "measurements" || cmd === "measure") {
      return handleMeasurements(designerId, parts);
    }
    if (cmd === "new" && cmd2 === "order") {
      return handleNewOrder(designerId, parts);
    }
    if (cmd === "remind" || cmd === "chase") {
      return handleRemind(designerId, designer, parts);
    }

    // Unknown command
    return botReply(
      `I didn't understand that. Reply *HELP* to see all available commands.\n\nQuick commands:\n• CLIENTS\n• ORDERS\n• UNPAID\n• HELP`
    );
  } catch (error) {
    console.error("WhatsApp bot error:", error);
    return NextResponse.json({ success: false, error: "Bot error" }, { status: 500 });
  }
}

/**
 * GET — Meta WhatsApp Cloud API webhook verification
 *
 * When you set the webhook URL in Meta Developer dashboard,
 * Meta sends a GET request to verify your endpoint.
 * Set WHATSAPP_VERIFY_TOKEN in .env to any secret string.
 * Use that same string in the Meta dashboard.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode      = searchParams.get("hub.mode");
  const token     = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || "stitcha_bot_2025";

  if (mode === "subscribe" && token === verifyToken) {
    return new Response(challenge, { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}
