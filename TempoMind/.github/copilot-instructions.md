# Instrucciones para GitHub Copilot

> Copilot lee este archivo automáticamente en cada request de chat/inline (no en autocompletado de una sola línea).

## Lenguaje y estilo

- Responde y comenta el código en español.
- Código simple, directo y legible por sobre "elegante" o abstracto.
- Nombrado de variables y funciones descriptivo, evitando abreviaturas poco claras.
- Al finalizar cualquier cambio, formatea el código con Prettier antes de darlo por terminado.

## Prettier

- Si el proyecto no tiene un archivo `.prettierrc` en la raíz, créalo automáticamente con esta configuración antes de empezar a trabajar:

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5"
}
```

- Si ya existe un `.prettierrc` (o configuración de Prettier en `package.json`), respeta esa configuración y no la sobrescribas.

## Organización

- Respeta la estructura de carpetas y archivos ya existente en el proyecto; no la reorganices por tu cuenta.
- Coloca el código nuevo en el archivo o módulo que le corresponda según su responsabilidad, sin mezclar lógica no relacionada en un mismo archivo.
- Si una función o archivo crece demasiado, sugiere (no impongas) dividirlo, explicando por qué.

## Qué evitar

- No agregues dependencias nuevas sin preguntar antes.
- No modifiques archivos de configuración (`.env`, configs de build, CI/CD) salvo que se pida explícitamente.
- No generes boilerplate innecesario; prioriza soluciones mínimas y directas.
- No inventes APIs, funciones o endpoints que no existan en el proyecto — si no estás seguro, pregunta o revisa el código antes.
- No borres ni sobrescribas código existente sin necesidad clara.

## Seguridad

- Nunca subas ni sugieras subir archivos con información sensible (claves, tokens, credenciales, `.env`) a git.
- Si detectas que falta un `.gitignore` para este tipo de archivos, sugiere crearlo.

## Testing

- No ejecutes tests automáticamente; solo escribe o modifica código salvo que se indique lo contrario explícitamente.
