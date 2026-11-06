// @ts-check
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import noClockInDomain from "./eslint-local-rules/no-clock-in-domain.js";

const msg = (capa, permitido) =>
  `Arquitectura: ${capa} solo puede importar ${permitido}. Ver AGENTS.md > Estructura.`;

export default tseslint.config(
  { ignores: ["node_modules", "dist", "coverage"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: { local: { rules: { "no-clock-in-domain": noClockInDomain } } },
    rules: {
      "no-console": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],
    },
  },
  // domain: no importa nada (ni otras capas ni librerías de infraestructura)
  {
    files: ["src/domain/**/*.ts"],
    rules: {
      "local/no-clock-in-domain": "error",
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/application/**", "**/infrastructure/**", "**/ui/**"],
              message:
                "Arquitectura: domain no puede importar otras capas. Ver AGENTS.md > Estructura.",
            },
            {
              group: ["@prisma/*", "express", "next", "next/*", "react", "pg"],
              message:
                "Arquitectura: domain es TypeScript puro, sin frameworks ni BD. Ver AGENTS.md > Estructura.",
            },
          ],
        },
      ],
    },
  },
  // application: solo domain
  {
    files: ["src/application/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/infrastructure/**", "**/ui/**"],
              message: msg("application", "domain"),
            },
            {
              group: ["@prisma/*", "express", "next", "next/*", "react"],
              message: msg("application", "domain (usa puertos/interfaces)"),
            },
          ],
        },
      ],
    },
  },
  // infrastructure: application y domain, nunca ui
  {
    files: ["src/infrastructure/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/ui/**"],
              message: msg("infrastructure", "application y domain"),
            },
          ],
        },
      ],
    },
  },
  // ui: solo application (los tipos de domain llegan a través de application)
  {
    files: ["src/ui/**/*.ts", "src/ui/**/*.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/domain/**", "**/infrastructure/**", "@prisma/*"],
              message: msg("ui", "application"),
            },
          ],
        },
      ],
    },
  },
);
