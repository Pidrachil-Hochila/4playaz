import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

const NOTIFY_EMAILS = [
  'tgqtqtqtqt@gmail.com',
  'axxvimaneg@gmail.com',
  'melentevdavid9@gmail.com',
];

const DELIVERY_LABELS: Record<string, string> = {
  cdek:   'СДЭК',
  yandex: 'Яндекс Доставка',
  pochta: 'Почта России',
};

function fmt(price: unknown): string {
  const n = Number(price);
  if (!n && n !== 0) return '—';
  return n.toLocaleString('ru-RU') + ' ₽';
}

type Variant = { isPaid: boolean; badge: string; titleWord: string; tickerWord: string; subjectIcon: string; subjectWord: string; };

function variantFor(status: string): Variant {
  if (status === 'paid') {
    return {
      isPaid: true,
      badge: '\u{1F4B0} ЗАКАЗ ОПЛАЧЕН',
      titleWord: 'Оплачен заказ',
      tickerWord: 'PAID. SHIP IT.',
      subjectIcon: '\u{1F4B0}',
      subjectWord: 'Оплачен заказ',
    };
  }
  return {
    isPaid: false,
    badge: '\u{1F6D2} НОВАЯ ЗАЯВКА',
    titleWord: 'Новая заявка',
    tickerWord: 'AWAITING PAYMENT.',
    subjectIcon: '\u{1F6D2}',
    subjectWord: 'Новая заявка',
  };
}

function buildEmailHtml(order: Record<string, unknown>, v: Variant): string {
  const orderId        = order.id ?? '—';
  const fullName       = order.full_name ?? '—';
  const telegram       = order.telegram ?? '—';
  const phone          = order.phone ?? '—';
  const email          = order.email ?? '—';
  const productName    = order.product_name ?? '—';
  const productSize    = order.product_size ?? '';
  const deliveryMethod = DELIVERY_LABELS[String(order.delivery_method)] ?? order.delivery_method ?? '—';
  const deliveryAddr   = order.delivery_address ?? '—';
  const productPrice   = fmt(order.product_price);
  const createdAt      = order.created_at
    ? new Date(order.created_at as string).toLocaleString('ru-RU')
    : new Date().toLocaleString('ru-RU');

  const sizeRow = productSize
    ? `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:8px;">
        <tr>
          <td style="background-color:#1a0000;padding:12px 20px;border-left:3px solid #cc0000;">
            <p style="margin:0 0 2px;font-family:Oswald,Arial,sans-serif;font-size:10px;color:#888;letter-spacing:2px;text-transform:uppercase;">РАЗМЕР</p>
            <p style="margin:0;font-family:'Roboto Mono',monospace;font-size:18px;font-weight:600;color:#fff;letter-spacing:2px;">${productSize}</p>
          </td>
        </tr>
      </table>`
    : '';

  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${v.titleWord} #${orderId}</title>
  <link href="https://fonts.googleapis.com/css2?family=UnifrakturMaguntia&family=Oswald:wght@400;600;700&family=Roboto+Mono:wght@400;600&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0a0a0a;padding:40px 0;">
    <tr>
      <td align="center" style="padding:0 16px;">

        <table width="600" cellpadding="0" cellspacing="0" border="0"
          style="max-width:600px;width:100%;background-color:#111;border:1px solid #2a0000;border-top:4px solid #cc0000;">

          <!-- TICKER -->
          <tr>
            <td style="background-color:#cc0000;padding:7px 0;">
              <p style="margin:0;font-family:Oswald,Arial,sans-serif;font-size:11px;font-weight:600;color:#fff;letter-spacing:4px;text-transform:uppercase;text-align:center;">
                ${v.tickerWord} &nbsp;&#9679;&nbsp; ${v.tickerWord} &nbsp;&#9679;&nbsp; ${v.tickerWord}
              </p>
            </td>
          </tr>

          <!-- HEADER -->
          <tr>
            <td style="padding:36px 40px 24px;border-bottom:1px solid #220000;">
              <p style="margin:0 0 6px;font-family:Oswald,Arial,sans-serif;font-size:11px;color:#cc0000;letter-spacing:4px;text-transform:uppercase;">${v.titleWord.toUpperCase()}</p>
              <h1 style="margin:0;font-family:'UnifrakturMaguntia',Georgia,serif;font-size:52px;color:#fff;line-height:1;">4PLAYAZ</h1>
              <h2 style="margin:2px 0 0;font-family:'UnifrakturMaguntia',Georgia,serif;font-size:42px;color:#cc0000;line-height:1;">STORE.</h2>
            </td>
          </tr>

          <!-- ORDER BADGE -->
          <tr>
            <td style="padding:28px 40px 0;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background-color:#1a0000;border-left:4px solid #cc0000;padding:16px 20px;">
                    <p style="margin:0 0 4px;font-family:Oswald,Arial,sans-serif;font-size:11px;color:#cc0000;letter-spacing:3px;text-transform:uppercase;">${v.badge}</p>
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td>
                          <p style="margin:0;font-family:'Roboto Mono',monospace;font-size:26px;font-weight:600;color:#fff;letter-spacing:2px;">#${orderId}</p>
                        </td>
                        <td align="right">
                          <p style="margin:0;font-family:Oswald,Arial,sans-serif;font-size:12px;color:#555;letter-spacing:1px;">${createdAt}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- СУММА ЗАКАЗА -->
          <tr>
            <td style="padding:28px 40px 0;">
              <p style="margin:0 0 14px;font-family:Oswald,Arial,sans-serif;font-size:10px;font-weight:700;color:#cc0000;letter-spacing:4px;text-transform:uppercase;border-bottom:1px solid #2a0000;padding-bottom:8px;">// СУММА ЗАКАЗА</p>
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background-color:#1a0000;padding:18px 20px;border-top:3px solid #cc0000;">
                    <p style="margin:0 0 4px;font-family:Oswald,Arial,sans-serif;font-size:10px;color:#888;letter-spacing:2px;text-transform:uppercase;">ИТОГО</p>
                    <p style="margin:0;font-family:'Roboto Mono',monospace;font-size:32px;font-weight:600;color:#cc0000;letter-spacing:2px;">${productPrice}</p>
                    <p style="margin:6px 0 0;font-family:Oswald,Arial,sans-serif;font-size:13px;color:#aaa;">${productName}</p>
                  </td>
                </tr>
              </table>
              ${sizeRow}
            </td>
          </tr>

          <!-- ПОКУПАТЕЛЬ -->
          <tr>
            <td style="padding:28px 40px 0;">
              <p style="margin:0 0 14px;font-family:Oswald,Arial,sans-serif;font-size:10px;font-weight:700;color:#cc0000;letter-spacing:4px;text-transform:uppercase;border-bottom:1px solid #2a0000;padding-bottom:8px;">// ПОКУПАТЕЛЬ</p>

              <!-- ИМЯ + TELEGRAM -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:8px;">
                <tr>
                  <td width="48%" style="background-color:#1a1a1a;padding:14px 16px;border-top:2px solid #cc0000;">
                    <p style="margin:0 0 4px;font-family:Oswald,Arial,sans-serif;font-size:10px;color:#555;letter-spacing:2px;text-transform:uppercase;">ИМЯ</p>
                    <p style="margin:0;font-family:Oswald,Arial,sans-serif;font-size:18px;font-weight:600;color:#fff;">${fullName}</p>
                  </td>
                  <td width="4%"></td>
                  <td width="48%" style="background-color:#1a1a1a;padding:14px 16px;border-top:2px solid #cc0000;">
                    <p style="margin:0 0 4px;font-family:Oswald,Arial,sans-serif;font-size:10px;color:#555;letter-spacing:2px;text-transform:uppercase;">TELEGRAM</p>
                    <p style="margin:0;font-family:'Roboto Mono',monospace;font-size:16px;font-weight:600;color:#cc0000;">${telegram}</p>
                  </td>
                </tr>
              </table>

              <!-- ТЕЛЕФОН -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:8px;">
                <tr>
                  <td style="background-color:#1a1a1a;padding:14px 16px;border-top:2px solid #440000;">
                    <p style="margin:0 0 4px;font-family:Oswald,Arial,sans-serif;font-size:10px;color:#555;letter-spacing:2px;text-transform:uppercase;">ТЕЛЕФОН</p>
                    <p style="margin:0;font-family:'Roboto Mono',monospace;font-size:14px;color:#fff;">${phone}</p>
                  </td>
                </tr>
              </table>

              <!-- EMAIL -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background-color:#1a1a1a;padding:14px 16px;border-top:2px solid #440000;">
                    <p style="margin:0 0 4px;font-family:Oswald,Arial,sans-serif;font-size:10px;color:#555;letter-spacing:2px;text-transform:uppercase;">EMAIL</p>
                    <p style="margin:0;font-family:'Roboto Mono',monospace;font-size:14px;color:#ff4444;">${email}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ДОСТАВКА -->
          <tr>
            <td style="padding:28px 40px 0;">
              <p style="margin:0 0 14px;font-family:Oswald,Arial,sans-serif;font-size:10px;font-weight:700;color:#cc0000;letter-spacing:4px;text-transform:uppercase;border-bottom:1px solid #2a0000;padding-bottom:8px;">// ДОСТАВКА</p>

              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:8px;">
                <tr>
                  <td style="background-color:#1a1a1a;padding:14px 16px;border-top:2px solid #440000;">
                    <p style="margin:0 0 4px;font-family:Oswald,Arial,sans-serif;font-size:10px;color:#555;letter-spacing:2px;text-transform:uppercase;">МЕТОД</p>
                    <p style="margin:0;font-family:Oswald,Arial,sans-serif;font-size:17px;font-weight:600;color:#fff;">${deliveryMethod}</p>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background-color:#1a1a1a;padding:14px 16px;border-top:2px solid #440000;">
                    <p style="margin:0 0 4px;font-family:Oswald,Arial,sans-serif;font-size:10px;color:#555;letter-spacing:2px;text-transform:uppercase;">АДРЕС</p>
                    <p style="margin:0;font-family:Oswald,Arial,sans-serif;font-size:15px;color:#ddd;">${deliveryAddr}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- BOTTOM -->
          <tr>
            <td style="padding:40px;">&nbsp;</td>
          </tr>

          <!-- BOTTOM TICKER -->
          <tr>
            <td style="background-color:#cc0000;">
              <p style="margin:0;font-family:'UnifrakturMaguntia',Georgia,serif;font-size:22px;color:#fff;letter-spacing:3px;text-align:center;padding:14px 20px;">dont test my pimpin.</p>
              <p style="margin:0;font-family:Oswald,Arial,sans-serif;font-size:10px;color:rgba(255,255,255,0.5);letter-spacing:3px;text-transform:uppercase;text-align:center;padding:6px 20px 12px;">Автоматическое уведомление — не отвечайте на это письмо</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;
}

Deno.serve(async (req: Request) => {
  try {
    if (req.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const payload = await req.json();
    const record = payload.record ?? payload;
    const status = String(record.status ?? 'wait');
    const v = variantFor(status);

    const html = buildEmailHtml(record, v);
    const priceLabel = record.product_price
      ? Number(record.product_price).toLocaleString('ru-RU') + ' ₽'
      : '';

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'store@4playaz.ru',
        to: NOTIFY_EMAILS,
        subject: `${v.subjectIcon} ${v.subjectWord} #${record.id} — ${record.full_name ?? ''} — ${priceLabel}`,
        html,
      }),
    });

    const resendData = await resendRes.json();

    if (!resendRes.ok) {
      console.error('Resend error:', JSON.stringify(resendData));
      return new Response(JSON.stringify({ error: resendData }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, status, resend: resendData }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Function error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
