# El Bello Cubano — proyecto completo corregido (31 de octubre de 2026)

## Cambios realizados

- Página `promociones.html`: Promo Estándar ahora cuesta **S/ 200**. Se actualizó el botón de WhatsApp, su mensaje personalizado y las descripciones SEO donde figuraba S/ 180.
- Debajo de Yape / Plin / transferencia se muestra: **«📌 Importante: Los precios pueden variar según la temporada.»**
- El antiguo botón «Causeres VIP» de la cabecera de promociones se sustituyó por **«Escríbeme»**, con icono de WhatsApp y mensaje específico de consulta sobre promociones.
- En el menú de tres rayitas de `index.html`, los enlaces de grupos se sustituyeron por un botón compacto **«Escríbeme»**, con icono de WhatsApp y mensaje de contacto.
- Se corrigió en toda la página principal el número erróneo 51964913979 por el número correcto del Bello Cubano: **+51 964 912 979** (`51964912979` para enlaces wa.me). Los números de las agencias de envío de dinero y de paquetes se mantuvieron independientes.
- En el navegador interno de TikTok se conserva la opción de copiar el número y, en la página de promociones, también se puede copiar el mensaje personalizado.
- Los contadores TikTok, Facebook, Instagram y YouTube se consultan en paralelo y se animan coordinadamente con el archivo `assets/social-counters.js`. La suma de la portada aparece **solo cuando están las cuatro cifras verificadas**. No se presenta una suma parcial como total.
- Los contadores de Facebook e Instagram **ya no usan Livecounts, iframes ni Mixerno**. Sus endpoints `/api/facebook` y `/api/instagram` consultan exclusivamente Meta Graph API oficial. Si Meta no entrega una cifra, se muestra `—` en lugar de inventarla.
- La sección de YouTube conserva YouTube Data API cuando hay clave, con respaldo de la API de Mixerno; TikTok conserva la API de TokCounter del proyecto original.

## IMPORTANTE: configurar los contadores de Meta en Vercel

**No se incluyen ni inventan tokens privados en el ZIP.** Si ya estaban configurados en Vercel, revísalos y mantenlos. En el proyecto de Vercel, entra a **Settings → Environment Variables** y configura:

| Variable | Para qué sirve |
| --- | --- |
| `FACEBOOK_PAGE_ID` | ID numérico real de la página de Facebook de el Bello Cubano. |
| `FACEBOOK_PAGE_ACCESS_TOKEN` | Token de acceso a esa página, con permisos para consultar seguidores. |
| `INSTAGRAM_ACCESS_TOKEN` | Token válido de Meta para la cuenta profesional de Instagram @elbellocubano, usando Instagram Graph API con Facebook Login. |
| `INSTAGRAM_USER_ID` | ID numérico real de la cuenta profesional de Instagram. En el código está el ID anterior como valor por defecto, pero comprueba que realmente corresponda a tu cuenta. |
| `YOUTUBE_API_KEY` (opcional) | Usar YouTube Data API directamente cuando esté disponible. |

Para Instagram con Facebook Login, la cuenta de Instagram debe ser profesional (Business o Creator), estar vinculada y autorizada correctamente y tener los permisos correspondientes en Meta. Los tokens solo deben ir en las variables del servidor, **nunca en el HTML o JavaScript público**.

Después de guardar las variables, **vuelve a desplegar** el proyecto para que las funciones usen la configuración. Comprueba estos enlaces en tu dominio:

- `/api/facebook`
- `/api/instagram`
- `/api/tiktok`
- `/api/youtube`

Para que el número se muestre, cada endpoint debe devolver un JSON con `consulta_ok: true` y el contador numérico. Si Facebook o Instagram devuelven `503` con `missing_configuration: true`, falta configurar su token o ID. Si devuelven `502`, revisa permisos, vinculación de cuentas, expiración del token y respuestas de Meta. **No se ha podido comprobar aquí la validez de las credenciales privadas de tu cuenta de Vercel**.

## Cómo publicar

1. Descomprime el ZIP.
2. Copia todos los archivos y las carpetas `api` y `assets` **a la raíz** de tu repositorio o proyecto Vercel, junto a `index.html`, `promociones.html` y `vercel.json`.
3. Comprueba las variables de entorno de Meta y realiza un nuevo despliegue en Vercel.
4. Abre las páginas en móvil y escritorio y prueba los botones de WhatsApp y los contadores.

## Notas sobre los contadores

- Los cuatro números se consultan conjuntamente; una vez están disponibles, se animan de manera coordinada al mostrarse el bloque de redes.
- Actualización periódica aproximadamente cada 2 minutos y medio mientras la página está visible.
- Si alguna API falla temporalmente, el navegador puede conservar su último dato propio comprobado durante **24 horas**, marcado como antiguo. Si no hay dato fiable, muestra `—`.
- El total suma **seguidores y suscriptores de cuatro redes**, no personas únicas: una persona puede seguirte en más de una red.
- Esta versión no trae cifras precargadas ni falsos contadores.
