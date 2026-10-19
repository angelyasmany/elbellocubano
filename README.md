# El Bello Cubano — corrección API Instagram (19 octubre 2026)

## En GitHub, sustituye SOLO:
`api/instagram.js`

No cambies `index.html`, `promociones.html`, `api/followers.js`, `api/facebook.js`, `api/youtube.js` ni `api/_shared.js`. No se han cambiado imágenes.

## Orden de consulta de Instagram @elbellocubano
1. Instagram Graph API oficial, **solo si** configuraste `INSTAGRAM_ACCESS_TOKEN` en Vercel.
2. `https://livecounts.nl/instagram-realtime/embed/?u=elbellocubano&theme=light&size=m`
3. `https://livecounts.nl/instagram-realtime/?u=elbellocubano`
4. `https://mixerno.space/instagram-user-counter/elbellocubano` (fuente independiente, último recurso).

La página principal y el embed de Livecounts son **el mismo proveedor**. No se puede garantizar que ambos funcionen si cae su servicio. Un iframe que muestra un número NO garantiza que Vercel pueda extraerlo; el código intenta leer HTML y solo admite números asociados a @elbellocubano con etiqueta de seguidores. Si Livecounts muestra 1000 pero las otras fuentes discrepan significativamente, contrasta el dato antes de publicarlo. Si ninguna fuente ofrece datos confiables, devuelve `consulta_ok: false` en lugar de inventar seguidores.

La web existente pide `/api/instagram` cada 30 segundos mientras está abierta, pero el origen puede estar retrasado. La respuesta API incluye `source_stale` para indicar datos retrasados.

## Probar luego de subir a GitHub
Abre `https://TU-DOMINIO/api/instagram` y confirma:
- `consulta_ok: true`
- `cuenta: "elbellocubano"`
- `count` = número de seguidores
- `fuente` y `source_stale` indican procedencia/estado.

Si aparece `502` y `consulta_ok:false`, envía ese JSON. **No se ha verificado en vivo el origen desde este entorno; se probaron la sintaxis y los distintos escenarios con respuestas simuladas.**
