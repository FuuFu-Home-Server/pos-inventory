import react from "@vitejs/plugin-react"
import tsconfigPaths from "vite-tsconfig-paths"
import { defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    environmentMatchGlobs: [
      ["tests/components/**", "jsdom"],
      ["tests/hooks/**", "jsdom"],
    ],
    coverage: {
      provider: "istanbul",
      include: ["src/lib/**", "src/store/**", "src/components/**", "src/hooks/**"],
      exclude: ["src/lib/prisma.ts", "src/lib/auth.ts", "src/lib/midtrans.ts"],
      reporter: ["text", "html", "lcov"],
    },
  },
})
