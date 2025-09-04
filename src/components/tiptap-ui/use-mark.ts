import type { Mark } from "./mark-button/use-mark"

/**
 * Obtiene el nombre formateado de la marca
 */
export function getFormattedMarkName(type: Mark): string {
  const translations: Record<Mark, string> = {
    bold: "Negrita",
    italic: "Cursiva", 
    underline: "Subrayado",
    strike: "Tachado",
    code: "Código",
    superscript: "Superíndice",
    subscript: "Subíndice"
  }
  return translations[type] || type.charAt(0).toUpperCase() + type.slice(1)
}
