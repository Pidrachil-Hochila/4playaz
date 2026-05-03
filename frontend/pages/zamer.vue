<template>
  <div class="zamer-page">
    <div class="zamer-container">
      <h1 class="zamer-title">Таблица размеров</h1>
      <div class="zamer-meta">Все замеры указаны в сантиметрах · 4PLAYAZ</div>

      <div class="zamer-body">
        <section>
          <h2>Как снять мерки</h2>
          <p>Для точного подбора размера снимите мерки с помощью портновской ленты. Сравните свои параметры с таблицами ниже и выберите подходящий размер.</p>
        </section>

        <section>
          <h2>Футболки</h2>
          <div class="zamer-image-frame">
            <img src="/zamer-tshirt.png" alt="Таблица размеров — футболки" class="zamer-img" />
          </div>
        </section>

        <section>
          <h2>Худи</h2>
          <div class="zamer-image-frame">
            <img src="/zamer-hoodie.png?v=2" alt="Таблица размеров — худи" class="zamer-img" />
          </div>
        </section>

        <section>
          <h2>Худи оверсайз</h2>
          <div class="zamer-image-frame">
            <img src="/zamer-hoodie-oversize.png" alt="Таблица размеров — худи оверсайз" class="zamer-img" />
          </div>
        </section>

        <section>
          <h2>Лонгсливы</h2>
          <div class="zamer-image-frame">
            <img src="/zamer-longsleeve.png" alt="Таблица размеров — лонгсливы" class="zamer-img" />
          </div>
        </section>

        <section>
          <h2>Советы по выбору размера</h2>
          <p>Если ваши параметры находятся между двумя размерами — рекомендуем выбрать больший. При возникновении вопросов обращайтесь в Telegram: <a href="https://t.me/playaz_store" target="_blank">@playaz_store</a></p>
        </section>
      </div>

      <NuxtLink to="/" class="btn-back-link">← Вернуться в магазин</NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
useHead({ title: 'Таблица размеров — 4PLAYAZ' })
</script>

<style scoped>
.zamer-page { padding: 60px 20px 80px; }
.zamer-container { max-width: 720px; margin: 0 auto; }
.zamer-title { font-family: var(--font-cinzel); font-size: 26px; font-weight: 600; color: var(--white); margin-bottom: 8px; letter-spacing: 0.08em; }
.zamer-meta { font-size: 11px; color: var(--mid); letter-spacing: 0.1em; margin-bottom: 40px; }
.zamer-body { display: flex; flex-direction: column; gap: 28px; }
.zamer-body section h2 { font-family: var(--font-cinzel); font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--red); margin-bottom: 12px; }
.zamer-body section p { font-size: 13px; color: var(--light); line-height: 1.9; margin-bottom: 10px; }
.zamer-body a { color: var(--red-bright); }
.zamer-image-frame {
  border: 1px solid var(--mid);
  border-radius: 4px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.03);
  display: inline-block;
  width: 100%;
  box-sizing: border-box;
}
.zamer-img {
  width: 100%;
  height: auto;
  display: block;
  border-radius: 2px;
}
.btn-back-link { display: inline-block; margin-top: 40px; font-family: var(--font-cinzel); font-size: 9px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--mid); transition: color 0.2s; }
.btn-back-link:hover { color: var(--white); }
</style>
