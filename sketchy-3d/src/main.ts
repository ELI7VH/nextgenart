import {
  create3dSketch,
  createParams,
  useLight,
  useMesh,
  useStandardMaterial,
  useBox,
  useAmbient,
  start3dSketch,
  useOrthographicCamera,
  OrthographicCameraBounds,
} from '@dank-inc/sketchy-3d'

import { mapXY } from '@dank-inc/lewps'
import { hsl } from '@dank-inc/sketchy/lib/helpers/color'
import { Maff, Rando } from '@dank-inc/numbaz'

import { SuperMouse } from '@dank-inc/super-mouse'
import { Vec3 } from '@dank-inc/sketchy-3d/lib/types/common'

const params = createParams({
  element: document.getElementById('root')!,
  // dimensions: [600, 600],
  animate: true,
  background: [0x000000, 1],
})

const sketch = create3dSketch(
  ({ scene, camera, renderer, PI, TAU, container, sin, cos, context }) => {
    // Z is UP

    container.addEventListener('contextmenu', (e) => {
      if (!e.ctrlKey) {
        e.preventDefault()
        e.stopPropagation()
      }
    })

    const debug = {
      active: false,
      element: document.getElementById('debug')!,
      text: '',
      reset() {
        this.text = ''
        this.element.textContent = ''
      },
      update(...text: (string | number)[]) {
        if (!this.active) return
        this.text += text.join(' ') + '\n'
        this.element.textContent = this.text
      },
    }

    const ambient = useAmbient(0xffffff, 0.5)
    scene.add(ambient)

    const light = useLight(0xffffff, 2, [1, -1, 0])
    scene.add(light)

    const data = {
      clicked: false,
      rotation: { x: PI * 0.75, y: 0, z: 0 },
      xLim: 4,
      yLim: 5,
      index: 0,
      jndex: 0,
      scroll: {
        x: 0,
        y: 0,
        z: 0,
        dir: 1,
      },
      scaleFactor: 1,
      scale() {
        return [
          1 * this.scaleFactor,
          1 * this.scaleFactor,
          1 * this.scaleFactor,
        ] as Vec3
      },
    }

    scene.remove(camera)

    const mouse = new SuperMouse({ element: container, scrollScale: 0.001 })
    mouse.onScroll = (e) => {
      e.stopPropagation()

      data.scroll.y = e.deltaY

      const dir = e.deltaY > 0 ? 1 : -1

      if (data.scroll.dir !== dir) {
        data.jndex += 1
        data.scroll.dir = dir
      }

      data.index += data.scroll.dir
    }
    mouse.onClick = (e) => {
      e.stopPropagation()
      // remove context menu
      e.preventDefault()

      data.clicked = !data.clicked
      // box.rotation.x += PI * 0.25
      data.rotation.x += TAU * Rando.normal()
      data.rotation.z += TAU * Rando.normal()
    }

    const xLim = data.xLim
    const yLim = data.yLim

    const bounds: OrthographicCameraBounds = [-xLim, xLim, -yLim, yLim]
    camera = useOrthographicCamera(bounds)
    const depth = 10
    camera.position.set(0, depth, 0)
    camera.lookAt(0, 0, 0)
    scene.add(camera)

    const cubes = mapXY(xLim, yLim, (u, v) => {
      const i = u + v

      const h = Math.floor((Rando.normal() * 0.02 + 0.55) * 10) / 10

      const cube = useMesh(
        useBox([1, 1, 1]),
        useStandardMaterial(hsl(h, 1, 0.4)),
      )

      // this is wrong I think
      const x = Maff.map(u, bounds[0] + 1, bounds[1] - 1)
      const y = Maff.map(i, 0, -depth * 10)
      const z = Maff.map(v, bounds[2] + 1, bounds[3] - 1)

      cube.position.set(x, y, z)
      scene.add(cube)

      cube.x = x
      cube.y = y
      cube.z = z
      cube.u = u
      cube.v = v
      cube.i = i
      cube.bb = 0
      cube.rand = Rando.normal()
      cube.dir = Rando.normal() > 0.5 ? 1 : -1

      cube.rotation.x = Rando.normal() * TAU
      cube.rotation.y = Rando.normal() * TAU
      cube.rotation.z = Rando.normal() * TAU

      cube.ui = i / (xLim * yLim)

      return cube
    })

    const colors = [0xff69b4, 0x00ffff, 0x9370db] // hot pink, cyan, medium purple

    return ({ time, dt }) => {
      debug.reset()
      debug.update(container.clientWidth, container.clientHeight)

      if (data.scroll.dir < 0) {
        // scene bg to white
        renderer.setClearColor(0xffffff, 1)
      } else {
        renderer.setClearColor(0x000000, 1)
      }

      cubes.forEach((cube, i) => {
        if (!cube) return

        cube.rotation.y =
          (Math.floor(cube.rand * 2 * time + cube.i * 2 + cube.rand * 215 * 5) /
            5) *
          cube.dir
        cube.rotation.x = Math.floor(data.rotation.x * 6) / 6
        cube.position.set(cube.x, cube.y, cube.z)

        const ai = Math.abs(data.index)
        const ii = ai % cubes.length

        if (ii === i) {
          cube.rotation.y += mouse.scrollInertia * 0.05
          debug.update(ai, ii, data.jndex)

          const palleteIndex =
            (Math.floor(ai / cubes.length) + data.jndex) % colors.length
          debug.update(palleteIndex)

          cube.material.color.set(colors[palleteIndex])
        }
      })

      if (mouse.scrollInertia >= 0) {
        light.color.set(0xffffff)
        // light.intensity = 2 + mouse.scrollInertia * 0.01
        ambient.intensity = 0 + mouse.scrollInertia * 0.0001
        // box.scale.set(
        //   1 + mouse.scrollInertia * 0.002,
        //   1, // + mouse.scrollInertia * 0.001,
        //   1 + mouse.scrollInertia * 0.002,
        // )
      } else {
        light.color.set(0xff0000)
        light.intensity = 4
        // box.scale.y = 1 + mouse.scrollInertia * 0.001
        ambient.intensity = sin(time, 0.1, 0.2, 0.5)
      }

      // box.rotation.y += mouse.scrollInertia * 0.0001
      // box.rotation.y += dt

      // light.lookAt(box.position)
      mouse.update()
      renderer.render(scene, camera)
    }
  },
)

start3dSketch(sketch, params)
