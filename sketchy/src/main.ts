import { mapXY } from '@dank-inc/lewps'
import { Rando, Maff } from '@dank-inc/numbaz'
import { createParams, createSketch, loadSketch } from '@dank-inc/sketchy'
import { hsl } from '@dank-inc/sketchy/lib/helpers/color'
import { SuperMouse } from '@dank-inc/super-mouse'

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
  }

  const newPoint = (u: number, v: number) => ({
    u,
    uu: Maff.lerp(u, 1, 0.1),
    v,
    vv: Maff.lerp(v, 1, 0.1),
    h: 1,
    w: 0.7,
    life: Rando.normal(),
    color: {
      h: Rando.normal(0.04, 0.9),
      s: Rando.normal(0.05, 0.5),
      l: Rando.normal(0.2, 0.4),
    },
  })

  const points = mapXY(25, 25, newPoint)

  let shuffled = points.sort(() => Math.random() - 0.5)

  mouse.onClick = () => {
    // shuffled = shuffled.map((item, i) => newPoint(item.u, item.v))
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

        shuffled.forEach((item) => {
          const x = item.uu * width
          const y = item.vv * height

          saver(() => {
            context.translate(x, y)
            const r = Math.sin(t(0) + item.u) * TAU
            context.rotate(quantize(y + r, TAU / 4) + TAU / 8)

            context.scale(item.w, item.w)
            context.fillStyle = hsl(
              item.color.h + data.scrollU,
              item.color.s,
              item.color.l,
            )

            const uuu = (33 * item.v + t(0.1) + item.u) % 0.2

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
      // animate: true,
      dimensions: [element.clientWidth, element.clientHeight],
    }),
  )

  window.sketch = lifecycle
}

main()
