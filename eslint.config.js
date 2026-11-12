import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/', 'coverage/', 'node_modules/'] },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { ignoreRestSiblings: true }],
    },
  },
  {
    // La app web corre en el navegador, sin módulos ni dependencias.
    files: ['public/**/*.js'],
    languageOptions: {
      sourceType: 'script',
      globals: Object.fromEntries(
        [
          'window',
          'document',
          'location',
          'navigator',
          'localStorage',
          'fetch',
          'Audio',
          'Blob',
          'URL',
          'FileReader',
          'MediaRecorder',
          'SpeechSynthesisUtterance',
          'speechSynthesis',
          'requestAnimationFrame',
          'setTimeout',
          'clearTimeout',
          'setInterval',
          'clearInterval',
          'ArrayBuffer',
          'DataView',
          'Promise',
        ].map((name) => [name, 'readonly']),
      ),
    },
  },
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      globals: { console: 'readonly', process: 'readonly' },
    },
  },
);
