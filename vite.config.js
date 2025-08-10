import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [preact()],
  build: {
    // lib: {
    //   entry: resolve(__dirname, 'src/main.js'),
    //   name: 'MyLib',
    //   // the proper extensions will be added
    //   fileName: 'my-lib',
    // },

    rollupOptions: {
      output: {
        entryFileNames: "x-form.js",
        assetFileNames: "x-form.[ext]",
      },
    }
  }
})