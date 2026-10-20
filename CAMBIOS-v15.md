# Cambios de la versión 15

- Imágenes visibles convertidas a WebP de alta calidad: el conjunto principal pasó de más de 9 MB a menos de 1 MB, incluyendo la foto de perfil.
- Carga coordinada de portada, tarjetas y negocios para evitar que aparezcan desordenados.
- Inicio coordinado de los contadores y conservación temporal del último dato numérico verificado.
- Facebook usa dos caminos: API numérica y contador visual oficial de Livecounts como respaldo.
- TikTok mantiene TokCounter como origen principal y, en la vista privada, usa como segundo origen la API ya desplegada en Vercel.
- Encabezado de promociones compactado: “Paga una vez y aparece en las 3 redes”, contadores, “Elija su promoción” y precios.
- Eliminado el subtítulo “Contenido real 100% orgánico”.
- Añadida la opción “Abrir en tu navegador” al menú de tres rayas para visitantes que llegan desde el navegador interno de TikTok.
- Mensaje de WhatsApp de envío de dinero actualizado.
- Retoque localizado de los dientes de la portada; el resto del rostro y el diseño se conservaron.

## Nota sobre Facebook

El iframe de Livecounts se muestra directamente cuando la API no entrega un número verificable. Por la seguridad del navegador, el HTML no puede leer el número dibujado dentro de ese iframe para sumarlo al total; cuando la API numérica responde, sí se incluye en la suma.
