import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import jsxA11y from "eslint-plugin-jsx-a11y";

// A11y is a project-wide contract: catch issues at edit-time, never batch for
// a G9 sweep. eslint-config-next already registers the jsx-a11y plugin with 6
// baseline rules; we layer the additional rules from `strict` on top without
// re-registering the plugin (flat config forbids duplicate registrations).
const { rules: nextJsxA11yRules } = nextVitals[0];
const strictJsxA11yRules = Object.fromEntries(
  Object.entries(jsxA11y.flatConfigs.strict.rules).filter(
    ([key]) => !(key in (nextJsxA11yRules ?? {})),
  ),
);

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    name: "stap/jsx-a11y-strict-extras",
    rules: strictJsxA11yRules,
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Nested .next directories from agent worktrees and any other tooling.
    "**/.next/**",
    ".claude/worktrees/**",
    // Generated Prisma client.
    "lib/generated/**",
  ]),
]);

export default eslintConfig;
