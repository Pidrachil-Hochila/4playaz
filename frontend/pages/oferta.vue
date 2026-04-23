<template>
  <div class="oferta-page">
    <div class="oferta-container">
      <h1 class="oferta-title">Договор публичной оферты</h1>
      <div class="oferta-meta">Дата редакции: {{ new Date().getFullYear() }} г. · 4PLAYAZ</div>

      <div class="oferta-body">
        <section>
          <h2>1. Общие положения</h2>
          <p>Настоящий документ является публичной офертой (предложением) интернет-магазина 4PLAYAZ (далее — «Продавец») о заключении договора розничной купли-продажи товаров дистанционным способом с любым физическим лицом (далее — «Покупатель»), принявшим условия настоящей оферты.</p>
          <p>Акцептом настоящей оферты является проставление отметки (галочки) в поле «Я принимаю условия договора оферты» при оформлении заказа.</p>
        </section>

        <section>
          <h2>2. Предмет договора</h2>
          <p>Продавец обязуется передать в собственность Покупателя товары (одежду) в ассортименте и по ценам, размещённым на сайте, а Покупатель обязуется принять и оплатить товар.</p>
        </section>

        <section>
          <h2>3. Оформление заказа</h2>
          <p>Заказ считается принятым с момента успешной оплаты через платёжную систему ЮКасса. После оплаты на указанный email или телефон поступит подтверждение.</p>
        </section>

        <section>
          <h2>4. Оплата</h2>
          <p>Оплата производится в рублях РФ с использованием платёжного сервиса ЮКасса. Продавец не хранит данные банковских карт — все платёжные операции осуществляются на стороне ЮКасса.</p>
        </section>

        <section>
          <h2>5. Доставка</h2>
          <p>Доставка осуществляется транспортными компаниями СДЭК, Почта России или через сервис Яндекс Маркет по адресу, указанному Покупателем при оформлении заказа. Сроки и стоимость доставки зависят от выбранного способа и региона.</p>
        </section>

        <section>
          <h2>6. Возврат товара</h2>
          <p>Покупатель вправе вернуть товар надлежащего качества в течение 24 часов с момента получения, если товар оказался браком. В иных случаях возврат НЕ ПРИНИМАЕТСЯ!</p>
          <p>Для оформления возврата обратитесь в Telegram: <strong>@playaz_store</strong>.</p>
        </section>

        <section>
          <h2>7. Обработка персональных данных</h2>
          <p>Покупатель даёт согласие на обработку своих персональных данных (ФИО, телефон, email, адрес доставки) в целях исполнения договора купли-продажи, доставки товара и связи по вопросам заказа. Данные не передаются третьим лицам, кроме транспортных компаний для организации доставки и платёжных систем для проведения оплаты.</p>
          <p>Хранятся только ФИО, телефон и email (при наличии). Данные банковских карт не собираются и не хранятся.</p>
        </section>

        <section>
          <h2>8. Контакты</h2>
          <p>По всем вопросам обращайтесь в Telegram: <a href="https://t.me/playaz_store" target="_blank">@playaz_store</a></p>
        </section>
      </div>

      <div class="oferta-requisites">
        <h2 class="requisites-title">Реквизиты</h2>
        <p>ИНН: 773176839310</p>
      </div>

      <NuxtLink to="/" class="btn-back-link">← Вернуться в магазин</NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
useHead({ title: 'Договор оферты — 4PLAYAZ' })
</script>

<style scoped>
.oferta-page { padding: 60px 20px 80px; }
.oferta-container { max-width: 720px; margin: 0 auto; }
.oferta-title { font-family: var(--font-cinzel); font-size: 26px; font-weight: 600; color: var(--white); margin-bottom: 8px; letter-spacing: 0.08em; }
.oferta-meta { font-size: 11px; color: var(--mid); letter-spacing: 0.1em; margin-bottom: 40px; }
.oferta-body { display: flex; flex-direction: column; gap: 28px; }
.oferta-body section h2 { font-family: var(--font-cinzel); font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--red); margin-bottom: 12px; }
.oferta-body section p { font-size: 13px; color: var(--light); line-height: 1.9; margin-bottom: 10px; }
.oferta-body a { color: var(--red-bright); }
.btn-back-link { display: inline-block; margin-top: 40px; font-family: var(--font-cinzel); font-size: 9px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--mid); transition: color 0.2s; }
.btn-back-link:hover { color: var(--white); }
.oferta-requisites { margin-top: 48px; padding-top: 24px; border-top: 1px solid var(--mid); }
.requisites-title { font-family: var(--font-cinzel); font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--red); margin-bottom: 12px; }
.oferta-requisites p { font-size: 13px; color: var(--light); line-height: 1.9; margin-bottom: 6px; }
</style>
