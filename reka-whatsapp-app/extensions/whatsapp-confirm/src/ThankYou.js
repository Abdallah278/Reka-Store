// زرار "Continue on WhatsApp" في صفحة الشكر — نوت فوق الزرار، زرار بعرض كامل
// بنص كبير Bold، والرسالة فيها رقم الأوردر فقط.
import { extension, Button, BlockStack, Text } from "@shopify/ui-extensions/checkout";

const DEFAULT_NOTE = "طلبك بانتظار تأكيد الدفع. بعد تحويل المبلغ، اضغط الزر بالأسفل وأرسل لنا رسالة لتأكيد التحويل.";

export default extension("purchase.thank-you.block.render", (root, api) => {
  function render() {
    const s = (api.settings && api.settings.current) || {};
    const conf = (api.orderConfirmation && api.orderConfirmation.current) || {};
    const orderName = (conf.order && conf.order.name) || conf.number || "";

    const phone = String(s.phone || "201094881552").replace(/\D/g, "");
    const template = s.message || "Hello Reka Store, I want to complete payment for order {order}.";
    const msg = template.replace("{order}", orderName);
    const url = "https://wa.me/" + phone + "?text=" + encodeURIComponent(msg);

    for (const child of root.children) root.removeChild(child);
    root.appendChild(
      // BlockStack بدون inlineAlignment => العناصر بتتمدد بعرض الحاوية بالكامل
      root.createComponent(BlockStack, { spacing: "base", padding: "base" }, [
        root.createComponent(Text, { size: "base", emphasis: "bold" }, s.note || DEFAULT_NOTE),
        root.createComponent(Button, { to: url, external: true }, [
          root.createComponent(Text, { size: "medium", emphasis: "bold" }, s.label || "Continue on WhatsApp — تأكيد الدفع"),
        ]),
      ])
    );
  }

  render();
  if (api.orderConfirmation && api.orderConfirmation.subscribe) api.orderConfirmation.subscribe(render);
  if (api.settings && api.settings.subscribe) api.settings.subscribe(render);
});
