import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [
          ["babel-plugin-react-compiler", { target: "19" }],
        ],
      },
    }),
    tailwindcss(),
    tsconfigPaths(),
  ],
  test: {
    globals: true,
    // Pinned on purpose: ProcessAttendance and GetDashboardStats derive
    // "today" from getTimezoneOffset(), so an unpinned TZ makes the date roll
    // by one around midnight between CI (UTC) and a local machine.
    env: { TZ: "America/Mexico_City" },
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: [
            "src/{domain,application}/**/*.test.ts",
            "src/utils/helpers.test.ts",
          ],
        },
      },
      {
        extends: true,
        test: {
          name: "ui",
          environment: "jsdom",
          setupFiles: ["./src/test/setup.ts"],
          include: [
            "src/app/**/*.test.{ts,tsx}",
            "src/utils/CSVfunctions.test.ts",
          ],
        },
      },
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**"],
      exclude: [
        "src/**/*.test.*",
        "src/test/**",
        "src/main.tsx",
        "src/infrastructure/firebase/**",
      ],
    },
  },
})
