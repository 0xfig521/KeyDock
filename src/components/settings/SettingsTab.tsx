import { useTranslation } from "react-i18next"
import { useTheme } from "@/hooks/useTheme"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import i18n from "@/i18n/config"

export function SettingsTab() {
  const { t } = useTranslation()
  const { theme, setTheme } = useTheme()

  const isChinese = i18n.language === "zh"
  const isDark = theme === "dark"

  function toggleLanguage(checked: boolean) {
    i18n.changeLanguage(checked ? "zh" : "en")
  }

  function toggleTheme(checked: boolean) {
    setTheme(checked ? "dark" : "light")
  }

  return (
    <div className="flex-1 p-8 max-w-2xl overflow-y-auto">
      <div className="space-y-1 mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {t("settings.title")}
        </h1>
      </div>

      <Card>
        <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-foreground">
            {t("settings.theme")}
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            {t("settings.themeDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span
                className={`text-sm font-medium transition-colors ${
                  !isDark ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {t("settings.light")}
              </span>
              <Switch
                checked={isDark}
                onCheckedChange={toggleTheme}
                size="default"
              />
              <span
                className={`text-sm font-medium transition-colors ${
                  isDark ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {t("settings.dark")}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-foreground">
            {t("settings.language")}
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            {t("settings.languageDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span
                className={`text-sm font-medium transition-colors ${
                  !isChinese ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {t("settings.english")}
              </span>
              <Switch
                checked={isChinese}
                onCheckedChange={toggleLanguage}
                size="default"
              />
              <span
                className={`text-sm font-medium transition-colors ${
                  isChinese ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {t("settings.chinese")}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
