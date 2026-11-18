interface ImportMetaEnv {
  readonly BASE_URL: string;
  readonly PROD: boolean;
  readonly VITE_KAKAO_JAVASCRIPT_KEY?: string;
}
interface ImportMeta {readonly env: ImportMetaEnv}

declare module '*.webp' {const url: string; export default url}
declare module '*.mp3' {const url: string; export default url}
declare module '*.m4a' {const url: string; export default url}
declare module '*.ogg' {const url: string; export default url}
declare module '*.wav' {const url: string; export default url}
declare module '*.MP3' {const url: string; export default url}
declare module '*.M4A' {const url: string; export default url}
declare module '*.OGG' {const url: string; export default url}
declare module '*.WAV' {const url: string; export default url}
declare module '*.css' {}

declare module '*.png' {const url: string; export default url}
declare module '*.jpg' {const url: string; export default url}
declare module '*.jpeg' {const url: string; export default url}
declare module '*.avif' {const url: string; export default url}
declare module '*.svg' {const url: string; export default url}
declare module '*.woff2' {const url: string; export default url}
declare module '*.ttf' {const url: string; export default url}
