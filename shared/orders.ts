/**
 * Order status workflow. Payment is confirmed MANUALLY by the owner over
 * WhatsApp — nothing in the system ever marks an order paid automatically.
 */
export const ORDER_STATUSES = [
  "pending_contact",
  "contacted",
  "awaiting_transfer",
  "transfer_claimed",
  "paid",
  "approved",
  "preparing",
  "shipped",
  "completed",
  "rejected",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending_contact: "Pending contact",
  contacted: "Contacted",
  awaiting_transfer: "Awaiting transfer",
  transfer_claimed: "Transfer claimed",
  paid: "Paid",
  approved: "Approved",
  preparing: "Preparing",
  shipped: "Shipped",
  completed: "Completed",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

/**
 * Allowed transitions, enforced server-side. Terminal states can only be
 * reached deliberately; rejected/cancelled are reachable from any active
 * state; nothing leaves completed/rejected/cancelled.
 */
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending_contact: ["contacted", "awaiting_transfer", "rejected", "cancelled"],
  contacted: ["awaiting_transfer", "transfer_claimed", "rejected", "cancelled"],
  awaiting_transfer: ["transfer_claimed", "paid", "rejected", "cancelled"],
  transfer_claimed: ["paid", "awaiting_transfer", "rejected", "cancelled"],
  paid: ["approved", "preparing", "rejected", "cancelled"],
  approved: ["preparing", "shipped", "cancelled"],
  preparing: ["shipped", "cancelled"],
  shipped: ["completed", "cancelled"],
  completed: [],
  rejected: [],
  cancelled: [],
};

export const canTransition = (from: OrderStatus, to: OrderStatus) =>
  ORDER_TRANSITIONS[from]?.includes(to) ?? false;

export const isOrderStatus = (v: string): v is OrderStatus =>
  (ORDER_STATUSES as readonly string[]).includes(v);

/** Statuses shown on the public order page. Owner notes never leave the server. */
export const PUBLIC_STATUS_COPY: Record<OrderStatus, string> = {
  pending_contact: "We received your order request. Send the WhatsApp message so we can confirm it.",
  contacted: "We're in touch on WhatsApp about this order.",
  awaiting_transfer: "We sent transfer instructions on WhatsApp — the order is reserved while we wait.",
  transfer_claimed: "Thanks — we're verifying your transfer.",
  paid: "Payment received. We're getting your order ready.",
  approved: "Your order is confirmed.",
  preparing: "Your order is being prepared.",
  shipped: "Your order is on its way.",
  completed: "Delivered. Enjoy!",
  rejected: "This order could not be completed. Message us on WhatsApp for details.",
  cancelled: "This order was cancelled.",
};
