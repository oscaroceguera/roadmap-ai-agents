# Spec 001: Habits MVP

## Contexto y objetivo

Las personas que estudian pierden constancia en sus hábitos de estudio porque no tienen forma sencilla de ver si los están cumpliendo día a día. Esta funcionalidad introduce el núcleo mínimo de la aplicación: permitir crear hábitos de estudio, marcarlos como hechos cada día y visualizar la racha de días consecutivos de cumplimiento, para dar visibilidad inmediata del progreso y reforzar la constancia.

## Usuarios

Un único usuario, sin autenticación ni cuentas. La aplicación es de uso personal: quien la abre gestiona directamente sus propios hábitos de estudio.

## Historias de usuario

- Como estudiante, quiero crear un hábito de estudio indicando su nombre, para empezar a llevar registro de su cumplimiento diario.
- Como estudiante, quiero marcar un hábito como hecho hoy, para reflejar que cumplí con él.
- Como estudiante, quiero ver la lista de mis hábitos junto con su racha actual de días consecutivos, para saber qué tan constante he sido.
- Como estudiante, quiero marcar un hábito como hecho correspondiente al día de ayer (`habits done <nombre> --ayer`), para corregir un olvido de marcarlo el día anterior sin que se rompa mi racha.

## Requisitos funcionales

### RF-1: Crear hábito

- **RF-1.1**: El sistema deberá permitir crear un hábito nuevo indicando únicamente su nombre.
- **RF-1.2**: Cuando el usuario crea un hábito con un nombre no vacío, el sistema deberá añadirlo a la lista de hábitos con una racha inicial de 0 días.
- **RF-1.3**: Si el usuario intenta crear un hábito con el nombre vacío o compuesto solo por espacios, entonces el sistema deberá rechazar la creación y mostrar un mensaje de error.

### RF-2: Marcar hábito como hecho hoy

- **RF-2.1**: Cuando el usuario marca un hábito como hecho hoy y ese hábito no estaba marcado como hecho hoy, el sistema deberá registrar el día de hoy como completado para ese hábito y recalcular su racha.
- **RF-2.2**: Cuando el usuario marca como hecho un hábito que ya estaba marcado como hecho hoy, el sistema deberá mantener el estado actual sin duplicar el registro ni mostrar un error (operación idempotente).
- **RF-2.3**: Si el usuario intenta marcar como hecho un hábito que no existe, entonces el sistema deberá mostrar un mensaje de error sin modificar ningún dato.

### RF-3: Listar hábitos con racha

- **RF-3.1**: El sistema deberá mostrar todos los hábitos existentes junto con su racha actual de días consecutivos.
- **RF-3.2**: Mientras no exista ningún hábito creado, el sistema deberá mostrar un mensaje indicando que no hay hábitos registrados en lugar de una lista vacía.
- **RF-3.3**: El sistema deberá indicar, para cada hábito, si ya fue marcado como hecho en el día de hoy.

### RF-4: Cálculo de racha con día de gracia

- **RF-4.1**: El sistema deberá calcular la racha de un hábito como el número de días consecutivos en que fue marcado como hecho, permitiendo como máximo un día salteado aislado sin romper la racha.
- **RF-4.2**: Cuando el usuario marca como hecho un hábito habiendo salteado exactamente un día desde su última marca, el sistema deberá continuar la racha sumando 1, sin reiniciarla.
- **RF-4.3**: Cuando el usuario marca como hecho un hábito habiendo salteado dos o más días consecutivos desde su última marca, el sistema deberá reiniciar la racha a 1.
- **RF-4.4**: El sistema deberá restaurar el crédito de día de gracia cada vez que el hábito se marca como hecho, de modo que días salteados aislados y no consecutivos nunca se acumulen para romper la racha.

### RF-5: Marcar hábito como hecho ayer

- **RF-5.1**: El sistema deberá permitir marcar un hábito como hecho correspondiente al día de ayer mediante la orden `habits done <nombre> --ayer`.
- **RF-5.2**: Cuando el usuario marca un hábito como hecho ayer y ese hábito no estaba marcado como hecho ayer, el sistema deberá registrar el día de ayer como completado para ese hábito y recalcular su racha actual (la racha se sigue reportando respecto al día de hoy, según RF-3.1).
- **RF-5.3**: Cuando el usuario marca como hecho ayer un hábito que ya estaba marcado como hecho ayer, el sistema deberá mantener el estado actual sin duplicar el registro ni mostrar un error (operación idempotente, igual que RF-2.2 pero aplicada al día de ayer).
- **RF-5.4**: Si el usuario intenta marcar como hecho ayer un hábito que no existe, entonces el sistema deberá mostrar un mensaje de error sin modificar ningún dato.
- **RF-5.5**: Si el usuario intenta marcar como hecho ayer un hábito cuya fecha de creación es el día de hoy (es decir, el hábito no existía ayer), entonces el sistema deberá rechazar la marca y mostrar un mensaje de error, sin modificar ningún dato.

## Requisitos no funcionales

- **RNF-1**: Las tres operaciones (crear, marcar, listar) deben completarse y reflejarse en la interfaz en menos de 1 segundo bajo uso normal.
- **RNF-2**: Los hábitos y su historial de días marcados deben persistir entre sesiones y reinicios de la aplicación.
- **RNF-3**: Todo el contenido visible para el usuario (textos, mensajes de error) debe estar en español y ser comprensible para alguien sin conocimientos técnicos.
- **RNF-4**: Las reglas de negocio deben quedar completamente explícitas en esta spec, sin comportamientos ocultos, para que un desarrollador junior pueda implementarlas y mantenerlas sin ambigüedad.

## Casos límite

- Un hábito recién creado y marcado como hecho el mismo día debe tener racha = 1.
- Un hábito nunca marcado como hecho debe tener racha = 0.
- Si el usuario marca un hábito hoy, no lo marca mañana, y lo vuelve a marcar pasado mañana (un solo día salteado), la racha continúa sin reiniciarse.
- Si el usuario deja pasar dos o más días sin marcar, la racha se reinicia a 1 en la siguiente marca.
- El listado debe seguir mostrando correctamente todos los hábitos existentes sin límite de cantidad definido en este MVP.
- Se permite crear dos o más hábitos con el mismo nombre; no se valida unicidad de nombre (los hábitos se distinguen internamente por identificador, no por nombre).
- El cambio de "día" para determinar qué es "hoy" se define según la hora del servidor donde corre la aplicación.
- No existe un largo máximo de caracteres para el nombre de un hábito; solo se rechaza si está vacío o compuesto solo por espacios (RF-1.3).
- Si un hábito ya estaba marcado como hecho ayer y se ejecuta `--ayer` de nuevo, no se duplica el registro ni cambia la racha (RF-5.3).
- Marcar el día de ayer afecta la racha igual que marcar hoy: se recalcula sobre el conjunto completo de días marcados aplicando el día de gracia de RF-4, sin importar si "hoy" ya estaba marcado o no, ni el orden en que se registraron los días.
- Si un hábito no tiene marcas previas y se marca hoy y ayer (en cualquier orden), la racha resultante es 2.
- Si un hábito fue creado el mismo día de hoy (no existía ayer) y se intenta usar `--ayer` sobre él, la operación se rechaza (RF-5.5).
- `--ayer` solo admite el día inmediatamente anterior a hoy; no permite elegir una fecha arbitraria del pasado ni del futuro (ver "Fuera de alcance").

## Fuera de alcance

- Editar o eliminar hábitos existentes.
- Autenticación y soporte para múltiples usuarios.
- Frecuencias distintas a diaria (por ejemplo, N veces por semana).
- Marcar un hábito como hecho en una fecha distinta a "hoy" o "ayer" (dos o más días atrás, o en el futuro).
- Historial detallado por fecha, estadísticas o gráficos de progreso.
- Notificaciones o recordatorios.

## Criterios de finalización

- Un usuario puede crear un hábito indicando su nombre y verlo reflejado en el listado con racha 0.
- Un usuario puede marcar un hábito como hecho hoy y ver su racha actualizada según las reglas de RF-4.
- Un usuario puede listar todos sus hábitos junto con su racha actual y si fueron marcados hoy.
- Un usuario puede marcar un hábito como hecho ayer (`--ayer`) y ver su racha actualizada según las reglas de RF-4 y RF-5.
- Todos los requisitos funcionales (RF-1 a RF-5) y sus criterios de aceptación están implementados y verificados.
- Todos los casos límite tienen un comportamiento definido; no quedan dudas [NECESITA ACLARACIÓN] pendientes.

## Dudas abiertas

Ninguna. Las tres dudas iniciales quedaron resueltas:

- Unicidad del nombre del hábito: se permiten duplicados.
- Definición exacta de "día": hora del servidor.
- Límite máximo de caracteres para el nombre del hábito: sin límite.
