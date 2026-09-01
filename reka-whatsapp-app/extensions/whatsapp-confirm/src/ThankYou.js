// Banner تحذيري أصفر (رسمي من شوبيفاي) في صفحة الشكر: "طلبك بانتظار تأكيد الدفع"
// وجواه زرار واتساب بعرض كامل — الرسالة فيها رقم الأوردر فقط.
import { extension, Banner, Button, BlockStack, Text } from "@shopify/ui-extensions/checkout";

const DEFAULT_TITLE = "⏳ طلبك بانتظار تأكيد الدفع";
const DEFAULT_NOTE = "بعد تحويل المبلغ، اضغط الزر بالأسفل وأرسل لنا رسالة لتأكيد التحويل. لن يتم شحن الطلب قبل تأكيد الدفع.";

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
      root.createComponent(Banner, { status: "warning", title: s.title || DEFAULT_TITLE }, [
        root.createComponent(BlockStack, { spacing: "base" }, [
          root.createComponent(Text, { size: "base" }, s.note || DEFAULT_NOTE),
          root.createComponent(Button, { to: url, external: true }, [
            root.createComponent(Text, { size: "medium", emphasis: "bold" }, s.label || "Continue on WhatsApp — تأكيد الدفع"),
          ]),
        ]),
      ])
    );
  }

  render();
  if (api.orderConfirmation && api.orderConfirmation.subscribe) api.orderConfirmation.subscribe(render);
  if (api.settings && api.settings.subscribe) api.settings.subscribe(render);
});
