import * as THREE from 'three'

console.log(THREE)

let camera: THREE.PerspectiveCamera = null as unknown as THREE.PerspectiveCamera
let scene: THREE.Scene = null as unknown as THREE.Scene
let renderer: THREE.WebGLRenderer = null as unknown as THREE.WebGLRenderer

// todo loadSketch
// optimize later
const bodies: THREE.Mesh[] = []

function init() {
  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.01,
    1000,
  )

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(window.innerWidth, window.innerHeight)
  document.body.appendChild(renderer.domElement)

  const geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2)
  const material = new THREE.MeshNormalMaterial()

  const mesh = new THREE.Mesh(geometry, material)
  scene.add(mesh)
  bodies.push(mesh)

  camera.position.z = 2
}

function update() {
  const time = performance.now() * 0.001

  bodies.forEach((body, _) => {
    body.rotation.x = time
    body.rotation.y = time * 2
  })

  renderer.render(scene, camera)
}

function main() {
  init()
  update()
  renderer?.setAnimationLoop(update)
}

main()
