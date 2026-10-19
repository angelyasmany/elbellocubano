# el Bello Cubano — página principal

Archivos listos para colocar en la **raíz del repositorio de GitHub** conectado a Vercel. `index.html`, `promociones.html`, `api/` y `assets/` deben quedar en el mismo nivel. No hace falta instalar paquetes ni hacer un build.

## Contadores

- `api/followers.js`: consulta TokCounter para `@elbellocubano7` y conserva la transformación numérica acordada.
- `api/youtube.js` y `api/_shared.js`: leen el contador de suscriptores del canal `UCVvsVVbc0W8KIL1kRkIqWxQ` en Mixerno.
- La página consulta `/api/followers` y `/api/youtube` cada 30 segundos y anima las cifras. El mensaje **“Tu negocio lo ven … personas”** suma solamente esas dos cifras cuando ambas están disponibles. Es una suma de contadores, no una medición de personas únicas ni una garantía de visualizaciones.
- Facebook e Instagram conservan sus enlaces y muestran `—` en la portada hasta que se revisen sus fuentes. Los endpoints heredados quedan incluidos para que la página de promociones no pierda su conexión actual; sus cifras pueden no estar disponibles.
- Si una fuente no responde, se muestra `—` antes de recibir un valor válido. Después se mantiene el último dato recibido con el estado de actualización pendiente.

## Enlaces y contenidos pendientes

- **Ver precios** de promoción lleva a `promociones.html#plan-0`.
- **Clases de música**, **Limpieza de tanques** y el carrito muestran un aviso dentro de la página, porque todavía no hay página de clases, tarifas del tanque ni tienda.
- En `promociones.html`, los enlaces de WhatsApp mostrarán un aviso hasta que se configure `window.BELLO_CONFIG.whatsappNumber` con el número en formato internacional, sin `+` ni espacios.
- Las dos primeras fotos en “Negocios del mes” son ejemplos; el tercer espacio abre la página de promociones.

Los endpoints externos de TokCounter y Mixerno pueden cambiar o dejar de responder. El HTML no fabrica cifras si falla la consulta.
