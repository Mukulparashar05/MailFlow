/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  // Demo mode: the only address the email provider will deliver to. Set to "" to disable.
  readonly VITE_DEMO_RECIPIENT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
