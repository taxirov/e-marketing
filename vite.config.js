import { defineConfig } from 'vite'

// Dev-only proxy to bypass CORS by tunneling requests via Vite server
export default defineConfig({
  server: {
    proxy: {
      '/uyjoy': {
        target: 'https://api.uy-joy.uz',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/uyjoy/, ''),
        configure: (proxy) => {
          // Force Origin header to target to avoid backend CORS rejection
          proxy.on('proxyReq', (proxyReq, req) => {
            if (req.headers.origin) {
              proxyReq.setHeader('origin', 'https://api.uy-joy.uz')
            }
          })
        },
      },
    },
  },
})
