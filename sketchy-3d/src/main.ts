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

import io from 'socket.io-client'

import { micIn, MicIn } from './lib/micIn'
import { BeatMapper } from './lib/BeatMapper'

// Declare dankstore global type
declare global {
  interface Window {
    dankstore: {
      get(key?: string): any
      set(key: string, value: any): void
      register(
        schema: Record<
          string,
          {
            type: string
            default: any
            parse?: (value: string) => any
            min?: number
            max?: number
            options?: string[]
          }
        >,
      ): void
    }
  }
}

// patterns
// data -> scene -> entity -> render function
// action -> handler -> data
// osc -> handler -> data
// action -> osc

// todo: add movement to fill in space.
// todo: fuck with camera bounds, zoom into sections for spans of time and back out.

// todo: export key / button to export settings to a json file.
// todo: also export option to sharable link with query params.

// todo: add scale & number of things functionlaity, smaller things, more of them.

// Wait for dankstore to be ready
const waitForDankstore = (): Promise<void> => {
  return new Promise((resolve) => {
    if (window.dankstore) {
      resolve()
    } else {
      const checkInterval = setInterval(() => {
        if (window.dankstore) {
          clearInterval(checkInterval)
          resolve()
        }
      }, 10)
    }
  })
}

// Initialize everything after dankstore is ready
;(async () => {
  await waitForDankstore()

  window.dankstore.register({
    bpm: { type: 'range', min: 60, max: 200, default: 81.44, parse: Number },
    speed: { type: 'range', min: 0, max: 5, default: 1, parse: Number },
    xLim: { type: 'range', min: 1, max: 20, default: 7, parse: Number },
    yLim: { type: 'range', min: 1, max: 20, default: 11, parse: Number },
    depth: { type: 'range', min: 5, max: 50, default: 20, parse: Number },
  })

  const params = createParams({
    element: document.getElementById('root')!,
    // dimensions: [600, 600],
    animate: true,
    // background: [0x000000, 1],
    // background: [0x000000, 1],
  })

  const sketch = create3dSketch(
    ({ scene, camera, renderer, PI, TAU, container, sin, cos, context }) => {
      // Z is UP

      localStorage.debug = '*'

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

    const ambient = useAmbient(0xff0000, 0.6)
    scene.add(ambient)

    const light = useLight(0xffffff, 2, [1, -1, 0])
    scene.add(light)

    const cubeFab = () =>
      useMesh(useBox([0.4, 1, 1]), useStandardMaterial(hsl(0, 1, 0.4)))

    // todo get state from the server.

    const data = {
      mic: null as MicIn | null,
      micValue: 0,
      clicked: false,
      rotation: {
        x: PI * 0.75,
        y: 0,
        z: 0,
      },
      colors: [0xff69b4, 0x00ffff, 0x9b2339, 0x23399b] as const,
      sceneColorIndex: 0,
      cubeColorIndex: 0,
      margin: 1.2,
      xLim: window.dankstore.get('xLim'),
      yLim: window.dankstore.get('yLim'),
      index: 0,
      jndex: 0,
      speed: window.dankstore.get('speed'),
      beatmapSpan: Rando.normal() * 30 + 3,
      beatMapper: new BeatMapper(window.dankstore.get('bpm')),
      socket: io('relay.elijahlucian.ca'), // , 'http://localhost:8080'),
      scroll: {
        x: 0,
        y: 0,
        z: 0,
        dir: 1,
      },
      depth: window.dankstore.get('depth'),
      grid: [],
      cubes: [] as ReturnType<typeof cubeFab>[],
      clickSteps: 10,
      clickstep() {
        return this.clickSteps
      },
      scaleFactor: 1,
      scale() {
        return [
          1 * this.scaleFactor,
          1 * this.scaleFactor,
          1 * this.scaleFactor,
        ] as Vec3
      },
      generateCubes() {
        this.cubes.forEach((cube) => {
          scene.remove(cube)
        })
        this.cubes = []

        this.cubes = mapXY(this.xLim, this.yLim, (u, v) => {
          const i = u + v
          const h = Math.floor((Rando.normal() * 0.02 + 0.55) * 10) / 10
          const cube = cubeFab()

          const x = Maff.map(
            u,
            bounds[0] + this.margin,
            bounds[1] - this.margin,
          )

          const y = Maff.map(i, 0, -this.depth * 2)

          const z = Maff.map(
            v,
            bounds[2] + this.margin,
            bounds[3] - this.margin,
          )

          cube.position.set(x, y, z)
          scene.add(cube)

          cube.x = x
          cube.y = y
          cube.z = z
          cube.offset = { x: 0, y: 0, z: 0 }

          cube.u = u
          cube.v = v
          cube.i = i
          cube.bb = 0
          cube.rand = Rando.normal()
          cube.dir = Rando.normal() > 0.5 ? 1 : -1

          cube.rotation.x = Rando.normal() * TAU
          cube.rotation.y = Rando.normal() * TAU
          cube.rotation.z = Rando.normal() * TAU

          cube.ui = i / (this.xLim * this.yLim)

          return cube
        })
      },
      init() {
        this.generateCubes()
      },
    }

    scene.remove(camera)

    const bounds: OrthographicCameraBounds = [
      -data.xLim,
      data.xLim,
      -data.yLim,
      data.yLim,
    ]
    camera = useOrthographicCamera(bounds)
    camera.position.set(0, data.depth, 0)
    camera.lookAt(0, 0, 0)
    scene.add(camera)

    // actions

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
      data.beatMapper.reset()
      // box.rotation.x += PI * 0.25
    }

    // mouse
    // keyboard
    const init = async () => {
      data.mic = await micIn()

      data.beatMapper.every(5, (count) => {
        data.sceneColorIndex = count % data.colors.length
      })

      data.beatMapper.every(11, (count) => {
        data.cubeColorIndex = count % data.colors.length
      })

      data.beatMapper.every(7, (count) => {
        data.rotation.x += TAU * Rando.normal()
        data.rotation.z += TAU * Rando.normal()
      })

      data.beatMapper.every(43, (count) => {
        // todo: recurse and set a beatMapper.on(Rando.normal() * 100) to the same thing every time.
        data.beatmapSpan = Rando.normal() * 2 + 0
      })

      data.beatMapper.every(71, (count) => {
        // camera bounds child event handler
        // after handler fires, this handler should resume.
      })

      // recursive event handler, chnages the length of the beatmapSpa with each iteration.

      data.beatMapper.every(13, (count) => {
        data.cubes.forEach((cube) => {
          const scale = 0.2
          cube.offset.x = Rando.normal() * scale
          cube.offset.y = Rando.normal() * scale
          cube.offset.z = Rando.normal() * scale
        })
      })

      data.beatMapper.every(1, (count) => {
        data.cubes.forEach((cube) => {
          const scale = 0.005
          cube.offset.x += Rando.normal() * Math.abs(cube.rotation.x) * scale
          cube.offset.y += Rando.normal() * Math.abs(cube.rotation.y) * scale
          cube.offset.z += Rando.normal() * Math.abs(cube.rotation.z) * scale
        })
      })

      data.beatMapper.every(1, (count) => {
        // data.xLim = Rando.normal() * 10 + 10
        // data.yLim = Rando.normal() * 10 + 10
        // data.generateCubes()
      })

      data.socket.on('osc', (e: any) => {
        console.log('osc', e.address, e.args)

        switch (e.address) {
          case '/bpm':
            const bpm = e.args[0]
            data.beatMapper.bpm = bpm
            data.beatMapper.reset()
            break
          case '/songStart':
            data.beatMapper.reset()
            break
        }
      })

      data.socket.on('connect', () => {
        console.log('connected', data.socket.id, data.socket.connected)
      })

      data.socket.on('disconnect', () => {
        console.log('disconnected', data.socket.id, data.socket.connected)
      })

      data.socket.on('error', (e: any) => {
        console.log('socket error', e)
      })

      data.socket.on('data', (e) => {
        console.log('socket data', e)

        switch (e.address) {
          case '/bpm':
            const bpm = e.args[0]
            data.beatMapper.bpm = bpm
            data.beatMapper.reset()
            break
          case '/songStart':
            data.beatMapper.reset()
            break
        }
      })

      // data.oscServer.on('/songStart', () => {
      //   data.beatMapper.reset()
      // })

      // connect ot socket.elijahlucian.ca:2346

      // data.oscServer.on('/bpm', (e: any) => {
      //   console.log('bpm', e.args[0])
      // })
    }

    init()
    data.init()

    return ({ time, dt }) => {
      data.beatMapper.update(dt)

      scene.background = data.colors[data.sceneColorIndex]
      // scene.fog = colors[beat % colors.length]

      // energy level dance
      // renderer.setClearColor(scene.background)
      // energy level chill
      renderer.setClearColor(0x000000)

      debug.reset()
      debug.update(container.clientWidth, container.clientHeight)
      debug.update(data.beatMapper.beat)
      // console.log(beat)

      data.cubes.forEach((cube, i) => {
        if (!cube) return

        // bring back clicky rotation
        cube.rotation.y =
          cube.rand * 2 * time * data.speed + cube.i * 2 + cube.rand * 215 * 5
        // cube.dir

        cube.rotation.x = Math.floor(data.rotation.x * 6) / 6

        const cy = ((i + data.beatMapper.beat) / data.beatmapSpan) % 1

        cube.scale.set(1 - cy, 1 - cy, 1 - cy)

        cube.position.set(
          cube.x + cube.offset.x,
          cube.y + cube.offset.y,
          cube.z + cube.offset.z,
        )

        cube.material.color.set(data.colors[data.cubeColorIndex])

        const ai = Math.abs(data.index)
        const ii = ai % data.cubes.length

        if (ii === i) {
          cube.rotation.y += mouse.scrollInertia * 0.05
          debug.update(ai, ii, data.jndex)

          const palleteIndex =
            (Math.floor(ai / data.cubes.length) + data.jndex) %
            data.colors.length
          debug.update(palleteIndex)
        }
      })

      if (data.mic) {
        const micValue = (data.mic.tdData[0] - 128) / 128

        if (micValue > data.micValue) {
          data.micValue = micValue
        }
        data.micValue *= 0.98

        data.mic.updateByteTimeDomainData()
        light.intensity = 2 + data.micValue * 20
      } else {
        // light.color.set(0xff0000)
        light.intensity = 5 + data.beatMapper.interval * 2
        // box.scale.y = 1 + mouse.scrollInertia * 0.001
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
})()
