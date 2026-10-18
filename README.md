# El Bello Cubano — portada definitiva con servicios y contadores

Esta versión utiliza **la imagen que enviaste** (`Retrato cubano y servicios al atardecer(1).png`) como referencia y como portada, conservando su personaje, puesta de sol, saludo, tres tarjetas blancas, flechas y redes sociales. Las interacciones son HTML y JavaScript reales superpuestos sobre el diseño.

## Qué puedes utilizar

- `index.html`: nueva portada fiel a la imagen. La imagen de referencia está optimizada dentro de `assets/portada-definitiva.webp`. Las tarjetas están recortadas de esa misma imagen, no de las versiones anteriores.
- **Promociona tu negocio o marca → Ver precios** abre `promociones.html`, que se conservó del proyecto entregado (S/ 180, S/ 220, S/ 350).
- **Clases de Música → Ver precios** muestra un aviso claro mientras no existan precios o página definitiva; no se inventa información.
- **Limpieza de tanques de agua → Próximamente** muestra su información de próximo servicio en Ica.
- Las flechas, puntos y gesto horizontal cambian las tarjetas manualmente (sin rotación automática).
- El icono del carrito abre el menú con enlaces a **promociones** y a **Los Causeres VIP**: https://tiktok.me/group/ZSgYJE5BA/
- TikTok, Facebook, Instagram y YouTube llevan directamente a tus perfiles reales al pulsar sus iconos.
- Los cuatro contadores utilizan el código existente del proyecto RAR: `counters.js`, `api/contadores.js`, `lib/tiktok.mjs` y `lib/social-counts.mjs`. Cuando el navegador recibe un número confirmado de la fuente, lo muestra. Si la fuente no responde, usa `—` o conserva el último dato obtenido durante esa visita. **No muestra cifras de muestra ni suma seguidores artificialmente.**

### Importante sobre los contadores

La API utiliza proveedores externos públicos que pueden fallar, limitar consultas o devolver datos atrasados. **No son cuatro conexiones oficiales garantizadas en tiempo real**. Instagram, Facebook y YouTube dependen de proveedores no oficiales; TikTok conserva tu transformación de TokCounter (que suma valores según intervalos, por lo que no siempre es la lectura bruta de seguidores).

Hay que confirmar que el ID de YouTube en `lib/social-counts.mjs` — `UCVvsVVbc0W8KIL1kRkIqWxQ` — corresponde realmente a `@elbellocubano`, porque se heredó del RAR y no se pudo verificar de forma independiente. Un ID incorrecto puede mostrar los suscriptores de otra cuenta. **Confírmalo antes de anunciar esa cifra al público.**

Las API responden en las rutas:

- `/api/followers` — TikTok
- `/api/facebook` — Facebook
- `/api/instagram` — Instagram
- `/api/youtube` — YouTube
- `/api/contadores` — resumen conjunto

## Publicar con GitHub + Vercel

1. Descomprime el archivo ZIP. **Sube a la raíz del repositorio el contenido de la carpeta**, no el archivo ZIP cerrado ni la carpeta contenedora completa.
2. Conserva `index.html`, `promociones.html`, las carpetas `assets/`, `api/`, `lib/`, `tests/` y `scripts/`, y los archivos `vercel.json`, `package.json`, `counters.js`, `site-config.js` y `contact.js`. No sustituya `index.html` por `promociones.html`.
3. Si GitHub ya está conectado a Vercel, confirma los cambios mediante *Commit changes* y espera un nuevo despliegue. Para un proyecto nuevo, importa el repositorio en Vercel, Framework: `Other`; Root Directory: carpeta que contiene `package.json` y `vercel.json`. No requiere configuración de un framework ni un build de frontend.
4. Comprueba la portada, flechas, el acceso a promociones y las rutas `/api/followers`, `/api/instagram`, `/api/facebook`, `/api/youtube` en **tu dominio** de Vercel.
5. Si un contador muestra «—», abre su ruta de API y lee el mensaje de error. Puede ser un problema de la fuente externa y no de tu código.

`package.json` ya contiene `"type":"module"`, para usar ESM sin la advertencia anterior.

## WhatsApp (pendiente de configurar)

Las acciones de WhatsApp en promociones no pueden abrir un chat real hasta que introduzcas tu número en `site-config.js`. Debe tener indicativo del país y solo dígitos (sin el signo `+`). **No he inventado tu número.** Los botones muestran un aviso mientras esté vacío.

## Pruebas

Requiere Node 22+ para las pruebas y para el servidor local.

```bash
npm test
npm start
```

Abrir `http://localhost:3000`. Las API de Vercel solo funcionarán en un servidor, no abriendo `index.html` con doble clic desde el disco. Las pruebas cubren el adaptador de API, las cuatro redes con respuestas simuladas, animación y fallos, caché, validación de datos, WhatsApp y el contenido estático. También se probó el diseño nuevo en Chromium a anchura móvil, el carrusel, los mensajes y el menú con respuestas simuladas de los contadores.

**Estado honesto:** el código y los flujos fueron probados localmente, pero el contenedor de pruebas no tiene salida directa a las fuentes externas: `/api/...` devolvió `fetch failed` al comprobar en vivo. No se puede prometer que esas páginas de terceros estén respondiendo hoy, ni que todos los contadores funcionen hasta comprobarlo en tu despliegue real de Vercel.

## Estructura

```text
index.html
promociones.html
counters.js
page-ready.js
contact.js
site-config.js
package.json
vercel.json
server.mjs
api/
  contadores.js
lib/
  tiktok.mjs
  social-counts.mjs
assets/
  portada-definitiva.webp
  tarjeta-1.webp
  tarjeta-2.webp
  tarjeta-3.webp
  portada-optimizada.webp  # recurso de promociones.html
  perfil-el-bello-cubano.jpg  # recurso de promociones.html
scripts/
tests/
```

### Modificar la imagen más adelante

Los textos del saludo, fotografías y textos de tarjetas están dentro de las imágenes proporcionadas, y los controles van superpuestos en HTML. Para editar esos textos visuales necesitarás editar la imagen base y recrear los recortes de tarjetas, o convertirlos a texto HTML. El resto de enlaces y contadores sí están configurados como elementos HTML funcionales.
