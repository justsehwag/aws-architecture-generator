/**
 * Web Speech API type declarations for browsers that use vendor-prefixed API.
 * The standard SpeechRecognition is included in TypeScript's dom lib,
 * but webkitSpeechRecognition needs explicit declaration.
 */

interface Window {
  SpeechRecognition: typeof SpeechRecognition;
  webkitSpeechRecognition: typeof SpeechRecognition;
}
