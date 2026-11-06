// Regla ESLint local: el dominio no debe leer el reloj (Date.now / new Date()).
// La fecha se inyecta desde application (un Clock) para que el dominio sea determinista.
/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "Prohíbe Date.now() y new Date() sin argumentos en src/domain",
    },
    messages: {
      noClock:
        "El dominio no lee el reloj. Recibe la fecha como parámetro (ver AGENTS.md > Reglas).",
    },
    schema: [],
  },
  create(context) {
    return {
      "CallExpression[callee.object.name='Date'][callee.property.name='now']"(
        node,
      ) {
        context.report({ node, messageId: "noClock" });
      },
      "NewExpression[callee.name='Date'][arguments.length=0]"(node) {
        context.report({ node, messageId: "noClock" });
      },
    };
  },
};
