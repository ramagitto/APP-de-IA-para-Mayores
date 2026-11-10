# Checklist del trámite de Meta

Esta guía es para quien del grupo arranque el trámite en **diciembre de 2026**, sin necesidad de saber programar. La integración técnica empieza en enero. Conviene llegar con esto hecho, porque depende de plazos que no controlamos.

Basada en la documentación de Meta consultada el 30/10/2026. **Las pantallas y las reglas de Meta cambian:** si algo no coincide, seguí lo que diga Meta y corregí este archivo.

> **El repositorio es público.** No escribas acá nombres, teléfonos, tarjetas, claves ni capturas de la cuenta. Guardalos en un lugar privado del grupo.

## Antes de empezar

Definir entre el grupo, y dejarlo por escrito fuera de este repositorio:

- [ ] Quién es el titular de la cuenta durante el piloto.
- [ ] Quién es el segundo administrador. Si el titular no está disponible, alguien más tiene que poder entrar.
- [ ] Quién atiende la palabra `AYUDA`: una persona o una rotación del equipo.

## 1. Línea de teléfono

- [ ] Conseguir una **línea nueva, dedicada a Charlá**, que no sea el número personal de nadie.
- [ ] Comprobar que recibe SMS o llamadas: por ahí llega el código de verificación. Meta pide un número propio con código de país y de área; no acepta códigos cortos.
- [ ] **No instalarle WhatsApp común ni WhatsApp Business app.** Un número que ya está en WhatsApp no se puede registrar sin borrarlo antes de ahí.
- [ ] Mantener la línea activa y con saldo: se puede volver a necesitar para verificar. Sin esa línea, se puede perder el acceso al número.

## 2. Portafolio de Meta

- [ ] Crear un portafolio de negocio **exclusivo para Charlá**, sin mezclarlo con otros negocios. Esto facilita la migración posterior.
- [ ] Sumar al segundo administrador.
- [ ] Activar la verificación en dos pasos en las cuentas de los administradores.
- [ ] Crear la cuenta de WhatsApp dentro del portafolio.

## 3. Número y nombre visible

- [ ] Agregar el número en WhatsApp Manager y verificarlo con el código.
- [ ] Cargar como nombre visible **Charlá**. Las reglas están en el Centro de ayuda de Meta: leelas antes, porque la documentación técnica no las detalla.
- [ ] Revisar el estado del nombre. Si lo rechazan, se puede editar y volver a enviar, o apelar. Se puede cambiar hasta 10 veces cada 30 días.
- [ ] Guardar de forma privada el PIN de 6 dígitos de verificación en dos pasos. **Si se pierde, se complica recuperar el número.**
- [ ] Anotar el identificador del número (`PHONE_NUMBER_ID`) y el de la cuenta. El registro final en la API (`/register`) lo hace quien programa, en la Fase 4.

## 4. Medio de pago

- [ ] Cargar una tarjeta en la cuenta. **Sin medio de pago, Meta no entrega nada después de los 1.000 mensajes gratis del mes.**
- [ ] Elegir **pesos argentinos** como moneda, si está disponible: el mensaje de servicio cuesta ARS 37,68, un 6,5% menos que en dólares al oficial de $1.550.
- [ ] Antes de confirmar, averiguar si después se puede cambiar la moneda. No lo pudimos confirmar.
- [ ] Revisar las [tarifas vigentes](https://whatsappbusiness.com/products/platform-pricing/#rates), que pueden cambiar el 1/1 y el 1/4, y actualizar [costos](whatsapp-y-costos.md) si cambiaron.
- [ ] Configurar una alerta de gasto, si la plataforma lo permite. Presupuesto del piloto para WhatsApp: ARS 19.000 a 40.500.

## 5. Plantillas

Solo hacen falta para escribirle a alguien fuera de la ventana de 24 horas. Meta revisa cada una, y **puede tardar hasta 24 horas** por revisión. Las apelaciones también se resuelven en 24 horas.

Los textos listos para enviar, cómo cargarlos y las reglas que cumplen están en **[plantillas-whatsapp.md](plantillas-whatsapp.md)**. Son tres: `charla_recordatorio`, `charla_repaso` y `charla_respuesta_equipo`. No llevan el nombre de la persona, porque no lo guardamos.

- [ ] Revisar los textos con contenidos.
- [ ] Cargarlos en WhatsApp Manager, en Spanish (ARG), código `es_AR`.
- [ ] Anotar acá la categoría que asignó Meta y el estado:

| Plantilla                 | Estado | Categoría asignada | Costo por envío |
| ------------------------- | ------ | ------------------ | --------------- |
| `charla_recordatorio`     |        |                    |                 |
| `charla_repaso`           |        |                    |                 |
| `charla_respuesta_equipo` |        |                    |                 |

## 6. Para el futuro: migración a una cuenta institucional

- **La cuenta de origen tiene que estar verificada para migrar,** según la [guía de Meta](https://developers.facebook.com/documentation/business-messaging/whatsapp/solution-providers/support/migrating-phone-numbers-among-solution-partners-via-embedded-signup.md). La guía está pensada para socios de Meta, así que falta confirmar que aplique a nuestro caso.
- [ ] Averiguar qué documentos pide la verificación del negocio y si un titular persona física puede completarla. **No lo pudimos confirmar.** Puede requerir una entidad legal.
- El número conserva nombre, calidad y límite de mensajes. Las plantillas se recrean y su calificación vuelve a cero.
- El piloto no necesita verificación: el [límite inicial](https://developers.facebook.com/documentation/business-messaging/whatsapp/messaging-limits) es de 250 usuarios por día, y son 30.

## Cuándo está terminado

- [ ] Línea activa, con el código de verificación recibido.
- [ ] Portafolio exclusivo, con 2 administradores.
- [ ] Nombre visible aprobado.
- [ ] Tarjeta cargada y moneda confirmada.
- [ ] Plantillas aprobadas, o enviadas a revisión.
- [ ] Identificadores y PIN guardados en un lugar privado.
- [ ] Avisarle a quien programa, para empezar la Fase 4.
