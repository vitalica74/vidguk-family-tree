# Модулі

- `index.html` — розмітка інтерфейсу.
- `src/css/main.css` — стилі.
- `src/js/app.js` — поточна робоча логіка додатку, винесена з HTML без зміни області видимості, тому кнопки `onclick` працюють.
- `src/js/modules/i18n.js` — базова система мов.
- `src/lang/*.json` — переклади.
- `service-worker.js` — офлайн-кеш PWA.

Наступний етап: поступово переносити частини з `app.js` у `src/js/modules/tree.js`, `storage.js`, `zip.js`, `gedcom.js`, `merge.js`.
