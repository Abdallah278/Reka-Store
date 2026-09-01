// زرار "Continue on WhatsApp" في صفحة الشكر — الرسالة فيها رقم الأوردر فقط.
import { extension, Button, BlockStack } from "@shopify/ui-extensions/checkout";

export default extension("purchase.thank-you.block.render", (root, api) => {
  function render() {
    const s = (api.settings && api.settings.current) || {};
    const conf = (api.orderConfirmation && api.orderConfirmation.current) || {};
    const orderName =
      (conf.order && conf.order.name) || conf.number || (conf.order && conf.order.id ? "" : "");

    const phone = String(s.phone || "201094881552").replace(/\D/g, "");
    const template = s.message || "Hello Reka Store, I want to complete payment for order {order}.";
    const msg = template.replace("{order}", orderName || "").replace(/\s+\.$/, ".");
    const url = "https://wa.me/" + phone + "?text=" + encodeURIComponent(msg);

    for (const child of root.children) root.removeChild(child);
    root.appendChild(
      root.createComponent(BlockStack, { inlineAlignment: "center", padding: "base" }, [
        root.createComponent(
          Button,
          { to: url, external: true },
          s.label || "Continue on WhatsApp — تأكيد الدفع"
        ),
      ])
    );
  }

  render();
  if (api.orderConfirmation && api.orderConfirmation.subscribe) api.orderConfirmation.subscribe(render);
  if (api.settings && api.settings.subscribe) api.settings.subscribe(render);
});
