import { SketchyParams } from '@dank-inc/sketchy'

declare global {
  interface Window {
    sketch: SketchyParams
  }
}
