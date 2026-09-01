// نفس الـ Banner التحذيري في صفحة حالة الطلب.
import { extension, Banner, Button, BlockStack, Text } from "@shopify/ui-extensions/customer-account";

const DEFAULT_TITLE = "⏳ طلبك بانتظار تأكيد الدفع";
const DEFAULT_NOTE = "بعد تحويل المبلغ، اضغط الزر بالأسفل وأرسل لنا رسالة لتأكيد التحويل. لن يتم شحن الطلب قبل تأكيد الدفع.";

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
      root.createComponent(Banner, { status: "warning", title: s.title || DEFAULT_TITLE }, [
        root.createComponent(BlockStack, { spacing: "loose" }, [
          root.createComponent(Text, { size: "medium", emphasis: "bold" }, s.note || DEFAULT_NOTE),
          root.createComponent(Button, { to: url, external: true }, [
            root.createComponent(Text, { size: "large", emphasis: "bold" }, s.label || "Continue on WhatsApp — تأكيد الدفع"),
          ]),
        ]),
      ])
    );
  }

  render();
  if (api.order && api.order.subscribe) api.order.subscribe(render);
  if (api.settings && api.settings.subscribe) api.settings.subscribe(render);
});
