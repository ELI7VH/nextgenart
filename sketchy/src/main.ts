import { createParams, createSketch, loadSketch } from '@dank-inc/sketchy'
import { SuperMouse } from '@dank-inc/super-mouse'
import { Banger, getWav } from '@dank-inc/banger'

const main = async () => {
  const wav = await getWav('https://cdn.elijahlucian.ca/drawing.wav')
  let banger: Banger | null = null
  if (wav) {
    banger = new Banger({
      arrayBuffer: wav,
      name: 'banger',
      volume: 1,
      drift: 1000,
      onFail: () => console.error('Failed to load wav'),
      onLoaded: () => {
        console.log('wav loaded')
      },
    })
  }

  const element = document.getElementById('root')!
  element.innerHTML = ''

  type Item = {
    x: number
    y: number
    radius: number
    life: number
  }

  const items: Item[] = []

  const mouse = new SuperMouse({ element, scrollScale: 0.1 })

  mouse.onClick = () => {
    banger?.play()
    items.push({
      life: 100,
      x: mouse.x,
      y: mouse.y,
      radius: 10 + Math.abs(mouse.scrollY),
    })
  }
  mouse.onElement = true

  const sketch = createSketch(({ context, circle }) => {
    return ({ t, width, height }) => {
      // Genuary 3, 2025 - "Black On Black"
      context.fillStyle = '#000000'
      context.fillRect(0, 0, width, height)

      items.forEach((item) => {
        context.fillStyle = `rgba(255, 255, 255, ${item.life / 100})`
        context.strokeStyle = '#aaa'
        circle(item.x, item.y, item.radius, { stroke: true })
        item.life -= 1
      })

      const x = mouse.x
      const y = mouse.y
      const radius = Math.abs(mouse.scrollY) + 10

      context.fillStyle = '#fff'
      if (mouse.onElement) circle(x, y, radius)
    }
  })

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
