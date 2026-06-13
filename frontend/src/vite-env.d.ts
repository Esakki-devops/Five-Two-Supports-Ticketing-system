/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_SOCKET_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Side-effect CSS imports from @fontsource packages.
declare module '@fontsource-variable/inter';
declare module '@fontsource-variable/lexend';
