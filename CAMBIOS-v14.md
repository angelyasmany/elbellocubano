# Versión 14

- Banner actualizado usando el rostro de referencia, barba natural y cielo más despejado; se conserva el atardecer.
- API de YouTube y Facebook con límites de espera, validación de cuenta y métrica, caché de datos válidos y conservación del último dato durante un máximo de 24 horas. Las consultas simultáneas no comparten promesas de red entre peticiones del servidor.
- Un único archivo `assets/social-counters.js` controla los contadores en index y promociones. Guarda únicamente lecturas verificadas, no usa cifras inventadas, conserva datos anteriores con aviso y consulta nuevamente cada 30 segundos.
- El total suma las redes con lectura numérica válida. Si falta una, muestra un total parcial en vez de ocultarlo; el detalle aparece al pasar el cursor sobre el mensaje. Instagram mantiene su iframe original y su número no puede extraerse para sumar desde otro dominio.
- Facebook: si la API no consigue una lectura y tampoco hay un dato guardado válido, se muestra el embed original del proveedor dentro del contador. El embed es visual y no se añade al total. Su disponibilidad depende de Livecounts y Facebook; no se puede garantizar que el proveedor entregue números en todo momento.
- Las fechas antiguas de la fuente se identifican como dato anterior, no como conteo en tiempo real.
- Para usar las fuentes oficiales opcionales en Vercel: `FACEBOOK_PAGE_ID` y `FACEBOOK_PAGE_ACCESS_TOKEN`, o `YOUTUBE_API_KEY`. Ninguna credencial va en HTML ni en el ZIP.
- Se conservan las imágenes y cambios aprobados de los servicios y Promo Premium S/280.

Subir el contenido de esta carpeta al repositorio GitHub conectado a Vercel. Conservar `api/` y `assets/` completos. GitHub Pages por sí solo no ejecuta estas APIs.

Verificaciones: 7 pruebas de datos inválidos, identidad, expiración, caída de fuente, timeout, concurrencia y suma parcial; sintaxis de HTML/JS y build de la vista privada. La lectura pública de YouTube comprobada fue 38 suscriptores; Facebook no publicaba una lectura numérica en su página durante la revisión. No se presenta un número fijo como si fuera en vivo.
