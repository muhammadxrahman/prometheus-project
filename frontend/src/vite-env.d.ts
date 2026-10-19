/// <reference types="vite/client" />

interface ImportMetaEnv {
  // backend origin, e.g. http://localhost:3000; defaults to that when unset
  readonly VITE_API_BASE_URL?: string
}
