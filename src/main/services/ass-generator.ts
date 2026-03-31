import type { SubtitleEntry } from '../srt-parser'

export interface AssStyle {
  fontNameCJK: string        // SimSun, SimHei
  fontNameLatin: string      // Times New Roman, Arial
  fontSize: number           // 12-24
  bold: boolean
  italic: boolean
  fontColor: string          // hex e.g. "FFFFFF"
  outlineColor: string       // hex e.g. "000000"
  borderStyle: 'outline' | 'opaque-box'
}

const DEFAULT_STYLE: AssStyle = {
  fontNameCJK: 'SimHei',
  fontNameLatin: 'Arial',
  fontSize: 20,
  bold: false,
  italic: false,
  fontColor: 'FFFFFF',
  outlineColor: '000000',
  borderStyle: 'outline',
}

/**
 * Convert hex color "RRGGBB" to ASS color "&HBBGGRR&" format.
 * ASS uses BGR order with &H prefix.
 */
function hexToAss(hex: string): string {
  const r = hex.slice(0, 2)
  const g = hex.slice(2, 4)
  const b = hex.slice(4, 6)
  return `&H00${b}${g}${r}`
}

/**
 * Convert SRT timestamp "HH:MM:SS,mmm" to ASS timestamp "H:MM:SS.cc" format.
 * ASS uses centiseconds, not milliseconds.
 */
function srtTimeToAss(srtTime: string): string {
  const match = srtTime.match(/(\d+):(\d+):(\d+)[,.](\d+)/)
  if (!match) return '0:00:00.00'
  const [, h, m, s, ms] = match
  const cs = Math.round(parseInt(ms) / 10)
  return `${parseInt(h)}:${m.padStart(2, '0')}:${s.padStart(2, '0')}.${String(cs).padStart(2, '0')}`
}

/**
 * Generate ASS subtitle file content from entries and style settings.
 */
export function generateAss(entries: SubtitleEntry[], style?: Partial<AssStyle>): string {
  const s: AssStyle = { ...DEFAULT_STYLE, ...style }

  const boldFlag = s.bold ? -1 : 0
  const italicFlag = s.italic ? -1 : 0
  const borderStyleNum = s.borderStyle === 'opaque-box' ? 3 : 1
  const primaryColor = hexToAss(s.fontColor)
  const outlineColorAss = hexToAss(s.outlineColor)

  const header = `[Script Info]
Title: Caption KB Assistant Export
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${s.fontNameCJK},${s.fontSize},${primaryColor},&H000000FF,${outlineColorAss},&H80000000,${boldFlag},${italicFlag},0,0,100,100,0,0,${borderStyleNum},2,1,2,10,10,30,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text`

  const events = entries.map(entry => {
    const start = srtTimeToAss(entry.startTime)
    const end = srtTimeToAss(entry.endTime)
    // Replace newlines with ASS line break \\N
    const text = entry.text.replace(/\n/g, '\\N')
    return `Dialogue: 0,${start},${end},Default,,0,0,0,,${text}`
  })

  return header + '\n' + events.join('\n') + '\n'
}
