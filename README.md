# el Bello Cubano — últimos ajustes visuales

Sube el contenido de esta carpeta a la raíz de tu repositorio de GitHub conectado a tu alojamiento, conservando api/ y assets/.

Cambios de esta versión:
- Las dos formas de entrar desde la tarjeta de promoción (la tarjeta o Ver precios) apuntan a promociones.html#promociones. El encuadre comienza 28 px por encima del título Elija su promoción e incluye las redes sociales.
- TikTok, Facebook y YouTube usan la misma familia de sistema y el mismo peso 800 que el contador incrustado de Instagram. Se conservan los tamaños de cada página.
- Instagram tiene una entrada breve de 220 ms al cargar su iframe y entrar en pantalla; no se añaden esperas al proveedor ni se recarga el widget. Se respeta la preferencia de movimiento reducido.
- El número visible de Instagram sigue llegando directamente del widget original de Livecounts. El momento de su primera lectura depende de Livecounts; la animación de entrada del contenedor no permite detectar el primer dígito desde fuera del iframe.
- El total solo suma las lecturas que la API puede comprobar y puede ser parcial. WhatsApp y los demás elementos se conservan.

Se comprobaron la sintaxis de los scripts, los destinos de navegación y la compilación. No se realizó una prueba visual en navegador desde este entorno.
