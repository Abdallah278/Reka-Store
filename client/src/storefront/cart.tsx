import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import type { PublicProduct } from "./types";

/**
 * Request-order cart. No payment happens on this site — the cart prepares an
 * order request that is confirmed on WhatsApp, where the owner sends manual
 * transfer instructions.
 *
 * Only product ids + quantities are stored (sessionStorage, current browser
 * session). Prices are always resolved from the live catalogue and re-checked
 * on the server when the order is created.
 */

const STORAGE_KEY = "reka-cart-v1";
export const MAX_QTY = 20;

export type CartLine = { productId: number; quantity: number };

type CartContextValue = {
  lines: CartLine[];
  count: number;
  add: (product: PublicProduct, quantity?: number) => void;
  remove: (productId: number) => void;
  setQuantity: (productId: number, quantity: number) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function readStored(): CartLine[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((l): l is CartLine => typeof l?.productId === "number" && typeof l?.quantity === "number")
      .map(l => ({ productId: l.productId, quantity: Math.min(MAX_QTY, Math.max(1, Math.round(l.quantity))) }))
      .slice(0, 30);
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(readStored);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      /* storage unavailable — cart lives in memory only */
    }
  }, [lines]);

  const add = useCallback((product: PublicProduct, quantity = 1) => {
    if (product.isSoldOut) {
      toast.error(`${product.name} is sold out and can't be added.`);
      return;
    }
    setLines(prev => {
      const existing = prev.find(l => l.productId === product.id);
      if (existing) {
        return prev.map(l => (l.productId === product.id ? { ...l, quantity: Math.min(MAX_QTY, l.quantity + quantity) } : l));
      }
      if (prev.length >= 30) {
        toast.error("The cart is full.");
        return prev;
      }
      return [...prev, { productId: product.id, quantity: Math.min(MAX_QTY, Math.max(1, quantity)) }];
    });
    toast.success(`${product.name} added to your order`);
  }, []);

  const remove = useCallback((productId: number) => {
    setLines(prev => prev.filter(l => l.productId !== productId));
  }, []);

  const setQuantity = useCallback((productId: number, quantity: number) => {
    if (quantity < 1) {
      setLines(prev => prev.filter(l => l.productId !== productId));
      return;
    }
    setLines(prev => prev.map(l => (l.productId === productId ? { ...l, quantity: Math.min(MAX_QTY, quantity) } : l)));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<CartContextValue>(
    () => ({ lines, count: lines.reduce((sum, l) => sum + l.quantity, 0), add, remove, setQuantity, clear }),
    [lines, add, remove, setQuantity, clear]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}

/** Resolve cart lines against the live catalogue; drops vanished/unpublished products. */
export function resolveCart(lines: CartLine[], products: PublicProduct[]) {
  const items = lines
    .map(line => {
      const product = products.find(p => p.id === line.productId);
      return product ? { product, quantity: line.quantity, lineTotal: product.price * line.quantity } : null;
    })
    .filter((x): x is { product: PublicProduct; quantity: number; lineTotal: number } => x !== null);
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const blocked = items.filter(item => item.product.isSoldOut);
  return { items, subtotal, blocked };
}
