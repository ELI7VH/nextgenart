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
  ({ scene, camera, renderer, PI, TAU, container, sin, cos }) => {
    // Z is UP

    const ambient = useAmbient(0xffffff, 0.5)
    scene.add(ambient)

    const light = useLight(0xffffff, 2, [1, 1, 1])
    scene.add(light)

    const data = {
      clicked: false,
      rotation: { x: PI * 1.25, y: 0, z: 0 },
      scroll: {
        x: 0,
        y: 0,
        z: 0,
      },
      scaleFactor: 1.7,
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

      // box.rotation.y -= deltaY
    }
    mouse.onClick = (e) => {
      e.stopPropagation()

      data.clicked = !data.clicked
      // box.rotation.x += PI * 0.25
      data.rotation.x += PI * 0.25
    }

    const bounds: OrthographicCameraBounds = [-5, 5, 5, -5]

    camera = useOrthographicCamera(bounds)
    const depth = 10
    camera.position.set(0, depth, 0)
    camera.lookAt(0, 0, 0)
    scene.add(camera)

    const xLim = 20
    const yLim = 20
    const cubes = mapXY(xLim, yLim, (u, v) => {
      const i = u + v

      const cube = useMesh(
        useBox(data.scale()),
        useStandardMaterial(hsl(Rando.normal(), 1, 0.8)),
      )

      // this is wrong I think
      const x = Maff.map(u, bounds[0] - 1, bounds[1] + 1)
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

      cube.ui = i / (xLim * yLim)

      return cube
    })

    return ({ time, dt }) => {
      // box.position.y = 1 + Math.sin(time) * 1

      cubes.forEach((cube) => {
        cube.rotation.y = 0.5 * time + cube.i * 2
        cube.rotation.x = data.rotation.x
        cube.position.set(cube.x, cube.y, cube.z + sin(time + cube.i, 0.5, 0.1))
        cube.material.opacity = sin(time + cube.i, 0.5, 0.1)
      })

      if (mouse.scrollInertia >= 0) {
        light.color.set(0xffffff)
        light.intensity = 2 + mouse.scrollInertia * 0.01
        ambient.intensity = 0.2 + mouse.scrollInertia * 0.0001
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
