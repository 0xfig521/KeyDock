import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import en from "./locales/en.json"
import zh from "./locales/zh.json"

const STORAGE_KEY = "keydock-locale"

function getInitialLocale(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === "en" || stored === "zh") return stored
  } catch {
    // localStorage unavailable (e.g. SSR)
  }
  return "en"
}

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, zh: { translation: zh } },
  lng: getInitialLocale(),
  fallbackLng: "en",
  interpolation: { escapeValue: false },
  returnObjects: false,
  keySeparator: ".",
})

i18n.on("languageChanged", (lng) => {
  try {
    localStorage.setItem(STORAGE_KEY, lng)
  } catch {
    // ignore
  }
})

export default i18n
