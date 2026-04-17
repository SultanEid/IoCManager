export type ThemeMode = "dark" | "light" | "gray"
export type ThemeStyle =
  | "default"
  | "new-york"
  | "vega"
  | "nova"
  | "maia"
  | "lyra"
  | "mira"
export type BaseColor =
  | "neutral"
  | "rose"
  | "cyan"
  | "blue"
  | "violet"
  | "amber"
  | "emerald"
  | "indigo"
  | "orange"
  | "teal"
  | "red"
  | "pink"
  | "purple"
  | "sky"
  | "lime"
  | "green"
  | "yellow"
  | "custom"
export type ThemePreset =
  | "neutral"
  | "stone"
  | "zinc"
  | "mauve"
  | "olive"
  | "mist"
  | "taupe"
  | "slate"
export type ButtonStyle = "default" | "soft" | "outline" | "ghost" | "pill"
export type MotionPreference = "balanced" | "reduced" | "enhanced"
export type LayoutDensity = "comfortable" | "compact"
export type FontFamily = "inter" | "system"

export type UserPreferences = {
  themeMode: ThemeMode
  themeStyle: ThemeStyle
  baseColor: BaseColor
  customPrimaryColor: string
  customSecondaryColor: string
  themePreset: ThemePreset
  buttonStyle: ButtonStyle
  motionPreference: MotionPreference
  layoutDensity: LayoutDensity
  fontFamily: FontFamily
}

export const THEME_MODE_OPTIONS: ThemeMode[] = ["dark", "light", "gray"]
export const THEME_STYLE_OPTIONS: ThemeStyle[] = [
  "default",
  "new-york",
  "vega",
  "nova",
  "maia",
  "lyra",
  "mira",
]
export const BASE_COLOR_OPTIONS: BaseColor[] = [
  "neutral",
  "rose",
  "cyan",
  "blue",
  "violet",
  "amber",
  "emerald",
  "indigo",
  "orange",
  "teal",
  "red",
  "pink",
  "purple",
  "sky",
  "lime",
  "green",
  "yellow",
  "custom",
]
export const THEME_PRESET_OPTIONS: ThemePreset[] = [
  "neutral",
  "stone",
  "zinc",
  "mauve",
  "olive",
  "mist",
  "taupe",
  "slate",
]
export const BUTTON_STYLE_OPTIONS: ButtonStyle[] = ["default", "soft", "outline", "ghost", "pill"]
export const MOTION_OPTIONS: MotionPreference[] = ["balanced", "reduced", "enhanced"]
export const DENSITY_OPTIONS: LayoutDensity[] = ["comfortable", "compact"]
export const FONT_FAMILY_OPTIONS: FontFamily[] = ["inter", "system"]

export const DEFAULT_PREFERENCES: UserPreferences = {
  themeMode: "dark",
  themeStyle: "default",
  baseColor: "neutral",
  customPrimaryColor: "#ff2f6d",
  customSecondaryColor: "#3b82f6",
  themePreset: "neutral",
  buttonStyle: "default",
  motionPreference: "balanced",
  layoutDensity: "comfortable",
  fontFamily: "inter",
}
