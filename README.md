# El Bello Cubano – reparación de dimensiones

Esta versión parte **exactamente** del proyecto `El-Bello-Cubano-Huacachina-v2-HTML-API.zip`, no de versiones anteriores. Se cambiaron únicamente los tamaños y estilos de las tarjetas del archivo `index.html`.

## Qué corrige
- Fotografías de los tres servicios: altura explícita proporcional al ancho de la página; ya no se muestran columnas exageradamente altas.
- Fotografías de “Negocios del mes”: altura compacta explícita, con recorte `object-fit: cover` sin deformación.
- Bloque de títulos y botones de las tarjetas: altura controlada para parecerse a la primera captura de referencia.
- Se quitaron atributos `width` y `height` de cinco imágenes cuyo tamaño debe determinar únicamente CSS (evitando conflictos con WebViews móviles).
- El paisaje, rostro, fotos originales, textos, precios, scripts, rutas y todas las API se conservaron.

No se han añadido nuevas funciones, credenciales ni cifras ficticias. El rendimiento y las API externas deben verificarse al publicarlo en Vercel.

## Instalar
Descomprimir. Guardar una copia del repositorio actual. Reemplazar el `index.html` anterior y, si otros archivos no estaban ya presentes, subir todo el contenido del ZIP a la raíz de GitHub (incluidas las carpetas `assets/` y `api/`). GitHub conectado con Vercel actualizará el despliegue tras confirmar cambios.

## Comprobar
Verificar en teléfonos de 320/390/430 px que las tarjetas aparecen juntas y compactas; pulsar flechas, “Ver precios”, el carrito, iconos de redes y los anuncios. Para los contadores en vivo comprobar `/api/followers` y `/api/youtube` en Vercel; Facebook e Instagram permanecen como estaban en el proyecto original.

---

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
