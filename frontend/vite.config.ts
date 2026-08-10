import path from 'path'
import { defineConfig, loadEnv, type PluginOption } from 'vite'
import react from '@vitejs/plugin-react'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import { sentryVitePlugin } from '@sentry/vite-plugin'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  const plugins: PluginOption[] = [TanStackRouterVite(), react()]

  // Sentry plugin must come last; skipped when no auth token (e.g. local dev)
  if (env.SENTRY_AUTH_TOKEN) {
    plugins.push(
      sentryVitePlugin({
        org: env.SENTRY_ORG,
        project: env.SENTRY_PROJECT,
        authToken: env.SENTRY_AUTH_TOKEN,
        sourcemaps: {
          filesToDeleteAfterUpload: ['./dist/**/*.map'],
        },
      }),
    )
  }

  return {
    server: {
      host: true,
      allowedHosts: ['localhost', '.ngrok-free.dev'],
    },
    build: {
      sourcemap: 'hidden',
    },
    plugins,
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  }
})
