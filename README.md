# Página principal y API — el Bello Cubano

Entrega lista para un repositorio GitHub y alojamiento en Vercel. Conserva el diseño aprobado. Se quitó únicamente la presentación «Soy el Bello Cubano» del saludo. El texto visible queda:

¡Asere, qué bola!
Espero que estos **servicios de calidad**
te sean de ayuda. **Dios te bendiga.**

La última frase comparte línea con «te sean de ayuda». Las imágenes, las tres tarjetas y los enlaces sociales están incluidos.

## Subir y activar

1. Descomprime este ZIP. Sube **el contenido de esta carpeta** a la raíz de tu repositorio de GitHub: index.html, assets, api, lib y los demás archivos. No subas solo el ZIP o solo index.html.
2. En Vercel, importa ese repositorio. Framework Preset: **Other**. Root Directory: la carpeta que contiene vercel.json. No hace falta comando de compilación ni instalación de dependencias; deja los ajustes de Build y Output Directory sin sobrescribir.
3. Despliega y abre la URL de Vercel. No funciona como API con doble clic en index.html ni alojándolo únicamente en GitHub Pages. Este paquete no se ha desplegado en tu cuenta de Vercel: hay que completar este paso.
4. Comprueba en tu dominio /api/contadores. Deben aparecer las cuatro redes y consulta_ok por cada una. Cada red también tiene su ruta individual.

El repositorio puede ser privado. La privacidad del sitio desplegado se configura por separado en Vercel; no depende de la privacidad del repositorio.

## Archivos

- index.html: diseño, texto, botones, carrusel, diálogos y enlaces.
- assets/: cinco imágenes WebP optimizadas. No elimines esta carpeta.
- page-ready.js: revela las imágenes y tarjetas juntas cuando están listas.
- counters.js: consulta las API y anima las cuatro cifras con el mismo efecto. No aumenta números por su cuenta. El valor final siempre procede del servidor.
- api/contadores.js: función de Vercel para todas las redes.
- lib/tiktok.mjs: consulta y validación de TikTok; conserva la transformación que proporcionaste.
- lib/social-counts.mjs: consulta y validación de Instagram, Facebook y YouTube.
- vercel.json: enlaza los endpoints del HTML con la función.
- server.mjs: servidor local opcional; no se necesita para Vercel.
- tests/: pruebas reproducibles sin dependencias.

## Endpoints

| Ruta | Cuenta | Métrica |
| --- | --- | --- |
| /api/followers | elbellocubano7 | TikTok: seguidores |
| /api/instagram | elbellocubano | Instagram: seguidores |
| /api/facebook | elbellocubano | Facebook: seguidores |
| /api/youtube | UCVvsVVbc0W8KIL1kRkIqWxQ | YouTube: suscriptores |
| /api/contadores | Las cuatro | Resultado conjunto por red |

El frontend consulta cada endpoint independientemente: una caída no bloquea los demás. Reintenta cada cinco segundos, aunque el servidor reutiliza lecturas durante 60 segundos en Instagram/Facebook y 10 segundos en YouTube. TikTok tiene caché HTTP de 5 segundos. Hay límites de tiempo y validación de cuenta y cifras. Si una consulta falla, se conserva el último dato obtenido en esa pestaña; si nunca hubo una lectura válida, aparece «—».

## Qué significan los datos y sus límites

Estas son fuentes externas públicas, no conexiones oficiales autenticadas a Meta o YouTube. Las cuatro respondieron correctamente durante la comprobación de esta entrega, pero su disponibilidad y frecuencia de actualización no están garantizadas.

- TikTok: TokCounter; se mantiene exactamente tu ajuste por intervalos. Por ejemplo, para 45 721 devuelve 45 771. El resultado transformado no debe confundirse con una lectura bruta oficial.
- Instagram: total renderizado en la página pública de Mixerno. No informa de la fecha de lectura original; la respuesta marca source_stale: true y updated_at: null. No es un flujo oficial en tiempo real.
- Facebook: lectura pública de Livecounts; conserva la fecha que esa página atribuye al dato y marca como antiguo si supera diez minutos. Puede permanecer igual aunque sigamos consultándola.
- YouTube: API pública de Mixerno para el ID de canal proporcionado, usando subscribers, nunca views. Comprueba que ese ID corresponde al canal que deseas mostrar; es independiente del enlace @elbellocubano de tu botón.

Pasa el ratón por una cifra para ver su fuente y fecha disponible. La animación visual no significa que esté llegando un seguidor nuevo cada milésima. Para datos oficiales con mayores garantías de Instagram/Facebook habría que conectar las cuentas y permisos correspondientes; este paquete no incluye credenciales de Meta y no inventa cifras para compensarlo.

No hay claves, tokens, identificadores privados de despliegue ni credenciales en el paquete.

## Pendientes que ya existían

El botón «Únete a Cubanos en Perú» conserva el aviso de enlace pendiente porque todavía falta el enlace real del grupo de Facebook. Los servicios de promoción y música conservan sus diálogos existentes; no se ha inventado una URL de página siguiente. Limpieza aparece como «Próximamente» y anuncia el 1 de enero de 2027 en Ica.

## Pruebas y uso local

Necesitas Node.js 22 o posterior. No requiere npm install.

```sh
npm test
npm start
```

Abre http://localhost:3000. Para comprobar las fuentes externas desde tu propia conexión:

```sh
npm run check:live
```

Las pruebas automáticas comprueban API, identidad de las cuentas, límites, fallos, caché, animación de los cuatro contadores y carga conjunta de imágenes. No sustituyen la comprobación visual en tu navegador ni la prueba posterior al despliegue en Vercel.

Documentación de referencia: https://vercel.com/docs/functions/quickstart
