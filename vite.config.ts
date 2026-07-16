import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const getBasePath = () => {
  if (process.env.GITHUB_ACTIONS !== 'true') return '/'

  const [owner, repository] = (process.env.GITHUB_REPOSITORY ?? '').split('/')
  if (!owner || !repository || repository.toLowerCase() === `${owner.toLowerCase()}.github.io`) return '/'

  return `/${repository}/`
}

// https://vite.dev/config/
export default defineConfig({
  base: getBasePath(),
  plugins: [react()],
  resolve: {
    alias: {
      'src': path.resolve(__dirname, './src')
    },
  },
})
