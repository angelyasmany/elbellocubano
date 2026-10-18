# El Bello Cubano — Ajustes de portada y servicios

Proyecto listo para repositorio GitHub + despliegue en Vercel.

## Cambios de esta versión

- Se retiraron las letras **impresas** del saludo y se recreó en HTML editable: «¡Asere, qué bola!» (rojo/negro); «Deseo que estos servicios de calidad te sean de ayuda.» (negro regular); «Dios te bendiga.» (negro negrita).
- El rostro y la composición del paisaje original permanecen; únicamente se retocaron de forma localizada los píxeles que contenían letras/carrito antiguos y la zona inferior donde estaban impresas las tarjetas, las flechas y los textos de contadores. El fondo original `assets/portada-definitiva.webp` se conserva como copia por seguridad.
- Carrito como botón real con SVG. Sigue abriendo su menú.
- Flechas y puntos como botones HTML, con carrusel manual y deslizamiento; se limpiaron las flechas incrustadas en las imágenes de las tarjetas y las franjas de arena externas a sus marcos.
- Footer: cuatro iconos azul discreto y números variables; se retiraron los rótulos innecesarios «Seguidores» / «Suscriptores».
- En `promociones.html`, el enlace superior antes «Escríbeme» ahora es «Los Causeres VIP» con icono TikTok: https://tiktok.me/group/ZSgYJE5BA/ . Se quitó el chip VIP repetido de abajo.
- Facebook conserva la consulta a la fuente pública y admite una consulta preferente a **Meta Graph API**, si configuras las credenciales de la página en Vercel. No hay números simulados ni credenciales dentro de HTML.
- Precios existentes de promociones: Estándar S/ 180; Premium S/ 220; Full S/ 350. No se cambiaron.

## Instalar en GitHub y Vercel

1. Haz una copia de seguridad de tu repositorio actual.
2. **Descomprime** el ZIP. Sube el contenido de la carpeta (no la carpeta envolvente) a la raíz de tu repositorio: `index.html`, `promociones.html`, `api/`, `lib/`, `assets/`, `package.json`, `vercel.json`, y demás archivos del proyecto. No elimines accidentalmente las carpetas `api` ni `assets`.
3. Confirma los cambios (`Commit changes`) en GitHub.
4. Si el repositorio está vinculado a Vercel, espera a que el deployment indique **Ready**.
5. Comprueba la portada en tu dominio, luego `/promociones.html`, `/api/followers`, `/api/facebook`, `/api/instagram` y `/api/youtube`.

## Contador de Facebook (alternativa oficial)

Si la lectura pública de `livecounts.nl` no funciona o está desactualizada, configura **solo en Vercel → Project → Settings → Environment Variables**, las siguientes variables (no incluirlas en GitHub):

- `FACEBOOK_PAGE_ID`: identificador numérico de tu página de Facebook (no el nombre ni la URL).
- `FACEBOOK_PAGE_ACCESS_TOKEN`: token de acceso de la página con los permisos necesarios para consultar el campo `followers_count` mediante Graph API.
- `FACEBOOK_GRAPH_API_VERSION`: opcional; por defecto `v24.0`.

Al guardar variables, **redeploy**. La función server-side `lib/social-counts.mjs` valida que la respuesta corresponde al ID solicitado, comprueba el número entero y nunca envía el token al navegador.

**Sin estas credenciales**, sigue intentando el lector público de Livecounts. Las fuentes externas pueden devolver un error, números con caché o bloquear las consultas; por lo tanto no se garantizan cifras en vivo sin comprobarlo en tu dominio real. Los cuatro contadores muestran un guion si fallan y se reintentan sin inventar números.

## Otros datos pendientes

- WhatsApp de promociones: aún no se ha configurado un número real. Los botones muestran un aviso en lugar de abrir un contacto equivocado. Añádelo en la configuración prevista por `site-config.js` cuando corresponda.
- YouTube: verifica que el identificador `UCVvsVVbc0W8KIL1kRkIqWxQ` corresponda a tu canal actual.
- El enlace de Los Causeres VIP lleva al grupo de TikTok. Los requisitos de suscripción los gestiona TikTok.
- Si usas un servidor local: `npm test` ejecuta las pruebas, `npm start` inicia el servidor en localhost.

## Estructura básica

- `index.html`: portada principal y botones.
- `promociones.html`: página de planes.
- `assets/portada-fondo-limpio.webp`: fondo de la portada sin textos ni icono de carrito impresos.
- `assets/tarjeta-{1,2,3}-limpia.webp`: imágenes de los tres servicios limpiadas.
- `counters.js`: presentación y animación de cifras.
- `api/contadores.js`, `lib/tiktok.mjs`, `lib/social-counts.mjs`: fuentes de los contadores.
- `tests/`: pruebas.
