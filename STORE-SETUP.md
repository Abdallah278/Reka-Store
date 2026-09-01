# Reka Store — إعداد الأوردرات والدفع (مرة واحدة)

الثيم بيوّدي العميل من السلة إلى Shopify Checkout مباشرة (بيدخل بياناته مرة واحدة هناك).
الخطوات دي في **Shopify Admin** بتكمّل الفلو: دفع يدوي باسم Vodafone Cash / InstaPay،
رقم أوردر بصيغة RKS، وزرار واتساب بعد إتمام الطلب.

---

## 1) طريقة الدفع اليدوية (بدون COD وبدون أي دفع إلكتروني)

**Settings → Payments:**

1. لو Shopify Payments أو أي بوابة إلكترونية مفعّلة → عطّلها (Manage → Deactivate).
2. تحت **Manual payment methods** → **Create custom payment method**:
   - **Custom payment method name:** `Vodafone Cash / InstaPay`
   - **Payment instructions** (بتظهر للعميل في صفحة الشكر مباشرة) — من غير أي أرقام تحويل،
     تعليمات التحويل بتتبعت يدويًا على واتساب:

     ```
     لإتمام الدفع، كلّمنا على واتساب برقم طلبك وهنبعتلك تعليمات التحويل:
     https://wa.me/201094881552
     الأوردر بيتشحن بعد تأكيد التحويل.
     ```
3. متضيفش Cash on Delivery.

> النتيجة: العميل يدوس Complete order → الأوردر يظهر في **Orders** بحالة **Payment pending**.

## 2) رقم الأوردر بصيغة RKS

**Settings → General → Order ID format:**
- Prefix: `RKS-` → الأوردرات هتبقى `RKS-1001`, `RKS-1002`...

## 3) زرار WhatsApp برسالة جاهزة في صفحة الشكر

**Settings → Checkout → Order status page → Additional scripts** — الصق:

الرسالة فيها **رقم الطلب فقط** — من غير منتجات أو مبالغ أو أرقام تحويل
(تعليمات التحويل بتبعتها انت يدويًا في الشات):

```liquid
<div style="text-align:center;margin:24px 0;">
  {% capture wa_msg %}Hello Reka Store, I want to complete payment for order {{ order.name }}.{% endcapture %}
  <a href="https://wa.me/201094881552?text={{ wa_msg | url_encode }}"
     style="display:inline-block;background:#25D366;color:#fff;padding:14px 28px;border-radius:999px;font-weight:bold;font-size:16px;text-decoration:none;">
    ✅ Continue on WhatsApp — تأكيد الدفع
  </a>
</div>
```

> لو خانة Additional scripts مش موجودة عندك (بعض المتاجر الجديدة على Checkout Extensibility):
> Payment instructions في الخطوة 1 هي البديل المدعوم — بتظهر في نفس الصفحة.
> وكمان ضيف نفس الزرار في إيميل التأكيد (الخطوة 4) فيوصل لكل عميل مضمون.

## 4) (مضمون لكل عميل) نفس الزرار في إيميل تأكيد الطلب

**Settings → Notifications → Customer notifications → Order confirmation → Edit code** —
الصق قبل نهاية الـ body:

```liquid
<p style="text-align:center;margin:24px 0;">
  {% capture wa_msg %}Hello Reka Store, I want to complete payment for order {{ order.name }}.{% endcapture %}
  <a href="https://wa.me/201094881552?text={{ wa_msg | url_encode }}"
     style="display:inline-block;background:#25D366;color:#fff;padding:12px 24px;border-radius:999px;font-weight:bold;text-decoration:none;">
    Continue on WhatsApp — تأكيد الدفع
  </a>
</p>
```

## 5) الشحن (رسوم المحافظات الحقيقية)

**Settings → Shipping and delivery → General shipping rates:**
- زون لمصر، وضيف Rates بنفس أسعار المحافظات المكتوبة في الثيم
  (Theme settings → Shipping zones هي للعرض فقط — المحاسبة الفعلية من هنا).
- لتفعيل الشحن المجاني فوق مبلغ: ضيف Rate بشرط "Based on order price" min = الحد.

## 6) دورة المراجعة اليدوية

من **Orders**: الأوردر بيوصل **Payment pending**.
- العميل حوّل؟ → افتح الأوردر → **Collect payment / Mark as paid** → كمّل الشحن.
- محوّلش؟ → **More actions → Cancel order**.

## 7) اختبار قبل النشر

1. المعاينة: https://1bc5y3-fx.myshopify.com?preview_theme_id=200711340113
2. ضيف منتج → Cart → **Checkout — pay by transfer**
3. عنوان تجريبي → شحن → طريقة الدفع "Vodafone Cash / InstaPay" → Complete order
4. اتأكد: الأوردر ظهر في Orders بحالة Payment pending + زرار/تعليمات الواتساب ظهرت في صفحة الشكر
5. اعمل Cancel للأوردر التجريبي، وبعدها انشر الثيم من Online Store → Themes → Publish

**ممنوع دائمًا:** أي Admin API token أو كود سيرفر في الثيم — كل اللي فوق إعدادات أدمن رسمية مدعومة.
