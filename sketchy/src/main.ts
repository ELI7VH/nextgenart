import { mapXY } from '@dank-inc/lewps'
import { Rando, Maff } from '@dank-inc/numbaz'
import { createParams, createSketch, loadSketch } from '@dank-inc/sketchy'
import { hsl } from '@dank-inc/sketchy/lib/helpers/color'
import { SuperMouse } from '@dank-inc/super-mouse'
import { micIn } from './lib/micIn'

const main = async () => {
  const element = document.getElementById('root')!
  element.innerHTML = ''

  const mouse = new SuperMouse({
    element,
    scrollScale: 0.1,
    enableContext: true,
  })

  const data = {
    scrollU: 0,
    scrollDir: 1,
    shuffled: false,
  }

  const newPoint = (u: number, v: number) => ({
    u,
    uu: Maff.lerp(u, 1, 0.1),
    v,
    vv: Maff.lerp(v, 1, 0.1),
    h: 1,
    r: Rando.normal(),
    w: 0.7,
    life: Rando.normal(),
    sound: 0,
    color: {
      h: Rando.normal(0.04, 0.9),
      s: Rando.normal(0.05, 0.5),
      l: Rando.normal(0.2, 0.4),
    },
  })

  const points = mapXY(32, 32, newPoint)

  let shuffled = points

  let mic = await micIn()

  mouse.onClick = async () => {
    if (!mic) {
      mic = await micIn()
    }
    if (data.shuffled) {
      shuffled = points
    } else {
      shuffled = points.sort(() => Math.random() - 0.5)
    }
  }

  mouse.onElement = true

  const quantize = (n: number, q: number) => {
    return Math.round(n / q) * q
  }

  const sketch = createSketch(
    ({ context, circle, saver, TAU, time, shape }) => {
      mouse.onScroll = (e) => {
        const dir = e.deltaY > 0 ? 1 : -1
        data.scrollU += dir * 0.02
      }

      return ({ t, width, height }) => {
        // Genuary 15, 2025 - "Design A Rug"

        context.fillStyle = '#000000'
        context.fillRect(0, 0, width, height)

        mic?.updateByteTimeDomainData()

        shuffled.forEach((item, i) => {
          const x = item.uu * width
          const y = item.vv * height

          const micValue = (mic?.tdData[i] - 128) / 128 || 0

          item.sound += Math.abs(micValue)

          saver(() => {
            context.translate(x, y)

            const r = Math.sin(item.u) * TAU

            context.rotate(
              quantize(y + r + t(item.r * 0.01), TAU / 4) + TAU / 8,
            )

            context.scale(item.w, item.w)
            context.fillStyle = hsl(
              item.color.h + data.scrollU + item.sound,
              item.color.s,
              item.color.l,
            )

            item.sound *= 0.99

            const uuu = (33 * item.v + item.u) % 0.2

            const modu = Math.sin(uuu * TAU)

            const s = quantize(0.5 * (Math.sin(modu * TAU) + 4) * 5 * 2, 3)

            context.strokeStyle = '#000'
            context.lineWidth = 5

            shape(
              [
                [s, -s * 2],
                [s, 0],
                [0, s * 2],
                [0, 0],
              ],
              {
                closed: true,
                fill: true,
                // stroke: true,
              },
            )
          })
        })
      }
    },
  )

  const lifecycle = loadSketch(
    sketch,
    createParams({
      element,
      animate: true,
      dimensions: [element.clientWidth, element.clientHeight],
    }),
  )

  window.sketch = lifecycle
}

main()
