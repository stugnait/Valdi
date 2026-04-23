# Monobank sync strategy (decision)

## Обрана модель

**Рекомендуємо webhook-first модель**:

- основний потік: `POST /api/integrations/monobank/webhook`;
- резервний потік: періодичний incremental sync через Celery beat (наприклад кожні 5-10 хв).

Це дає мінімальну затримку появи транзакцій (майже real-time) і покриває втрати подій/тимчасові збої через фоновий reconciliation.

---

## 1) Webhook endpoint (основний)

### Endpoint

- `POST /api/integrations/monobank/webhook`
- Валідація секрету в заголовку (наприклад `X-Mono-Webhook-Secret`) через `constant_time_compare`.
- Якщо секрет невалідний — `403`.

### Ідемпотентність

- Зберігати `event_id`/`statementItem.id` (або hash payload) і не обробляти дублікати.
- Дублікати повертати як `200` (або `202`) без помилки.

### Блокування конкурентних sync одного connection

Для обробки кожного connection:

- `SELECT ... FOR UPDATE SKIP LOCKED` на рядок інтеграції, або
- advisory lock (`pg_try_advisory_lock(connection_id)`), або
- Redis lock (`SET key NX EX 60`).

Рекомендація: PostgreSQL lock (без додаткової інфраструктури).

### Метрики

- `monobank_sync_duration_seconds` (histogram, labels: `source=webhook`, `status`).
- `monobank_sync_new_transactions_total` (counter).
- `monobank_sync_errors_total` (counter, labels: `error_type`).

### Алертинг (повторні fail)

- Лічильник поспіль невдалих спроб на рівні `connection`.
- Алерт при `>=3` поспіль помилках за 15 хв.
- Скидання лічильника при успішній синхронізації.

---

## 2) Incremental sync job (резервний)

### Планувальник

- Celery beat запускає `sync_monobank_incremental(connection_id)` пакетно по активних підключеннях.
- Частота: 5-10 хв (залежно від SLA і лімітів API).

### Блокування

Той самий lock-механізм, що й у webhook, щоб webhook і beat не обробляли одне connection паралельно.

### Інкрементальність

- Зберігати watermark (`last_synced_at` / `last_tx_cursor`).
- Запитувати лише інтервал після watermark.
- Після commit оновлювати watermark.

### Метрики

- `monobank_sync_duration_seconds` (labels: `source=cron`, `status`).
- `monobank_sync_new_transactions_total`.
- `monobank_sync_errors_total`.
- Опціонально: `monobank_sync_lag_seconds` (now - last_success_at).

### Алертинг

- Ті ж правила повторних fail.
- Додатково алерт на lag: `last_success_at > 30m`.

---

## Практична рекомендація по rollout

1. Запустити webhook endpoint + валідацію секрету.
2. Додати shared lock helper (один шлях для webhook/cron).
3. Додати метрики та дашборд.
4. Додати Celery beat incremental як safety-net.
5. Налаштувати алерти на repeated failures + sync lag.

## Чому webhook-first

- Краща latency для продукту.
- Менше зайвих polling-запитів.
- З beat-reconciliation зберігається надійність навіть при втраті webhook подій.
