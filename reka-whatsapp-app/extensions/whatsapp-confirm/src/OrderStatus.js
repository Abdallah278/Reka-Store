// نفس البلوك في صفحة حالة الطلب — نوت فوق زرار بعرض كامل بنص Bold.
import { extension, Button, BlockStack, Text } from "@shopify/ui-extensions/customer-account";

const DEFAULT_NOTE = "لإكمال الدفع، اضغط الزر وتواصل معنا على واتساب لتأكيد التحويل.";

export default extension("customer-account.order-status.block.render", (root, api) => {
  function render() {
    const s = (api.settings && api.settings.current) || {};
    const order = (api.order && api.order.current) || {};
    const orderName = order.name || order.confirmationNumber || "";

    const phone = String(s.phone || "201094881552").replace(/\D/g, "");
    const template = s.message || "Hello Reka Store, I want to complete payment for order {order}.";
    const msg = template.replace("{order}", orderName);
    const url = "https://wa.me/" + phone + "?text=" + encodeURIComponent(msg);

    for (const child of root.children) root.removeChild(child);
    root.appendChild(
      root.createComponent(BlockStack, { spacing: "base", padding: "base" }, [
        root.createComponent(Text, { size: "base" }, s.note || DEFAULT_NOTE),
        root.createComponent(Button, { to: url, external: true }, [
          root.createComponent(Text, { size: "medium", emphasis: "bold" }, s.label || "Continue on WhatsApp — تأكيد الدفع"),
        ]),
      ])
    );
  }

  render();
  if (api.order && api.order.subscribe) api.order.subscribe(render);
  if (api.settings && api.settings.subscribe) api.settings.subscribe(render);
});
