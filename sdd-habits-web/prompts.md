# Prompts SDD

## 1. Setup, constitution and AGENTS.md

**Constitution:**

```
Vamos a crear la constitucion de un proyecto nuevo: una Web en Next.js para registrar hábitos de estudio y calcular rachas de días consecutivos. Es un proyecto educativo ue debe de poder mantener un desarrollador junior.

Ponme un docs/constitution.md con 6 principios innegociables, cortos y verificables, que cubran: simplicidad del stack, relacion entre spec y codigo, separacion entre logica e interfaz, politica de tests, persistencia de datos e idioma del codigo y los mensajes. Maximo 15 lineas. Espera mi aprobacion.
```

**Specification:**

```
NO escribas código en ningún momento. Vamos a redactar la especificación de la
primera funcionalidad de habits-web. Lee docs/constitution.md.

Idea inicial: una Wep App con tres comandos: crear un hábito, marcarlo como hecho
hoy, y listar los hábitos con su racha de días consecutivos.

Tu trabajo:
1. Hazme preguntas de UNA en UNA para eliminar ambigüedades (casos límite,
   comportamiento con errores, qué queda fuera del MVP). Máximo 6 preguntas.
2. Con mis respuestas, genera specs/001-habits-mvp/spec.md con esta estructura:
   contexto y objetivo, usuarios, historias de usuario, requisitos funcionales
   numerados (RF-x) con criterios de aceptación en notación EARS en español,
   requisitos no funcionales, casos límite, fuera de alcance, criterios de
   finalización y dudas abiertas marcadas como [NECESITA ACLARACIÓN].
3. El QUÉ y el POR QUÉ. Nada de stack, arquitectura ni nombres de archivos:
   eso irá en el plan.
```

**Clarification:**

```
Revisa specs/001-habits-mvp/spec.md como si fueras un QA muy profesional.
Lista: (1) ambigüedades restantes, (2) contradicciones entre requisitos,
(3) casos límite no cubiertos, (4) conflictos con docs/constitution.md.
No propongas soluciones todavía: solo detecta. Formato: lista numerada.
```

**Plan:**

```
Lee docs/constitution.md y specs/001-habits-mvp/spec.md. NO escribas código.
Genera specs/001-habits-mvp/plan.md con: estructura de módulos, modelo de
datos JSON con un ejemplo, algoritmo de cálculo de racha en pseudocódigo,
contrato de la Wep (comandos, salidas, códigos de salida), decisiones técnicas
justificadas (y su alternativa descartada), y estrategia de tests. Todo debe
respetar la constitución y cubrir todos los RF. Marca qué RF cubre cada parte.
```

**Tasks:**

```
A partir de spec.md y plan.md, genera specs/001-habits-mvp/tasks.md:
tareas pequeñas (máx. 20-30 min cada una), en orden de dependencia, cada una
con los RF que cubre y una línea "Hecho cuando:" verificable. Usa checkboxes.
```

**Implementation:**

```
Implementa SOLO la tarea T2 de specs/001-habits-mvp/tasks.md, siguiendo
plan.md y la constitución. Escribe primero los tests, luego el código.
Al terminar: marca T2 en tasks.md,
indica qué RF cubre y PÁRATE. No empieces T3.
```

**Validation:**

```
Recorre specs/001-habits-mvp/spec.md requisito por requisito (RF-1 a RF-11).
Para cada uno indica: qué test lo cubre, y el resultado de ejecutarlo.
Si algún RF no está cubierto o falla, dilo claramente. Después comprueba los
criterios de finalización y dame un veredicto: ¿la spec está cumplida?

```

**Next Steps:**

```
Nuevo requisito para habits-web: marcar como hecho el día de ayer con
`habits done <nombre> --ayer`. NO toques código. Primero: actualiza
specs/001-habits-mvp/spec.md (nuevo RF con EARS + casos límite: ¿y si ayer
ya estaba marcado? ¿afecta a la racha?) y muéstrame el diff de la spec.
```
