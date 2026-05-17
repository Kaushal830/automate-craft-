import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Local agent/editor workspaces are not part of the app source. Without
    // these ignores, tools can lint stale copied projects and report fake
    // failures from hidden worktrees.
    ".claude/**",
    ".codex/**",
    ".cursor/**",
    ".vercel/**",
    "node_modules/**",
  ]),
  {
    rules: {
      // This project uses Framer Motion/typewriter/count-up UI patterns that
      // intentionally schedule small state transitions. Keep standard Next.js
      // linting active, but do not let React Compiler advisory rules block
      // external tools such as Antigravity from opening and analyzing the app.
      "react-hooks/immutability": "off",
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);

export default eslintConfig;
