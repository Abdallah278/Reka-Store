export const formatPrice = (value: number) => `${new Intl.NumberFormat("en-EG").format(value)} EGP`;

export const normalizePhone = (phone: string) => phone.replace(/\D/g, "");

/** Message shown to the customer in WhatsApp; product name + current formatted price. */
export const whatsappMessage = (name: string, price: number) => `Hi, I would like to ask about ${name}, priced at ${formatPrice(price)}.`;

export const whatsappProductUrl = (phone: string, name: string, price: number) =>
  `https://wa.me/${normalizePhone(phone)}?text=${encodeURIComponent(whatsappMessage(name, price))}`;

export const whatsappChatUrl = (phone: string, message?: string) =>
  `https://wa.me/${normalizePhone(phone)}${message ? `?text=${encodeURIComponent(message)}` : ""}`;

/* ------------------------------------------------------------------ */
/* Order request → WhatsApp handoff                                    */
/* ------------------------------------------------------------------ */

export type OrderMessageInput = {
  reference: string;
  customerName: string;
  phone: string;
  whatsapp?: string | null;
  city: string;
  address: string;
  building?: string | null;
  deliveryNotes?: string | null;
  items: { name: string; quantity: number; unitPrice: number }[];
  subtotal: number;
  deliveryFee: number;
  total: number;
};

/**
 * The complete order message the customer sends to the store. Built from
 * SERVER-side data only (the server recalculates every price and total before
 * this is generated — browser-supplied numbers are never trusted).
 */
export function buildOrderMessage(order: OrderMessageInput): string {
  const lines: string[] = [
    "Hello Reka Store, I would like to place an order.",
    "",
    `Order reference: ${order.reference}`,
    `Name: ${order.customerName}`,
    `Phone: ${order.phone}`,
  ];
  if (order.whatsapp && normalizePhone(order.whatsapp) !== normalizePhone(order.phone)) {
    lines.push(`WhatsApp: ${order.whatsapp}`);
  }
  lines.push(`City: ${order.city}`, `Address: ${order.address}`);
  if (order.building) lines.push(`Building/Floor/Apt: ${order.building}`);
  if (order.deliveryNotes) lines.push(`Notes: ${order.deliveryNotes}`);
  lines.push("", "Items:");
  for (const item of order.items) {
    lines.push(`- ${item.name} x ${item.quantity} — ${formatPrice(item.unitPrice)}`);
  }
  lines.push(
    "",
    `Subtotal: ${formatPrice(order.subtotal)}`,
    `Delivery: ${order.deliveryFee > 0 ? formatPrice(order.deliveryFee) : "to be confirmed"}`,
    `Total: ${formatPrice(order.total)}`,
    "",
    "Please confirm availability and send me the transfer instructions. I understand payment is confirmed manually by the store."
  );
  return lines.join("\n");
}

export const whatsappOrderUrl = (phone: string, order: OrderMessageInput) =>
  `https://wa.me/${normalizePhone(phone)}?text=${encodeURIComponent(buildOrderMessage(order))}`;
