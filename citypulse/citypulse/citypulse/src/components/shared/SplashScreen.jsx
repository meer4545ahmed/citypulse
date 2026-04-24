import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { supabase } from '../../lib/supabase'

const BOOT_LINES = [
  'INITIALIZING URBAN GRID',
  'CONNECTING IoT SENSOR MESH',
  'MAPPING CITY INFRASTRUCTURE',
  'ANALYZING TRAFFIC FLOW',
  'SMART CITY ONLINE',
]

const STATS = [
  { label: 'CITIZENS', value: '8,402,910' },
  { label: 'SENSORS', value: '12,840' },
  { label: 'STREETS', value: '4,205 KM' },
  { label: 'BUILDINGS', value: '186,420' },
]

function detectWebGL() {
  try {
    const c = document.createElement('canvas')
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl') || c.getContext('experimental-webgl')))
  } catch (_) {
    return false
  }
}

export default function SplashScreen({ hasSession = false, onFinish = () => {} }) {
  const mountRef = useRef(null)
  const [progress, setProgress] = useState(0)
  const [bootIndex, setBootIndex] = useState(0)
  const [phase, setPhase] = useState('boot')
  const [exiting, setExiting] = useState(false)
  const [use3D] = useState(() => (typeof window !== 'undefined' ? detectWebGL() : false))

  // ===== Three.js Smart City =====
  useEffect(() => {
    if (!use3D) return
    const mount = mountRef.current
    if (!mount) return
    const width = mount.clientWidth
    const height = mount.clientHeight

    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0x040814, 0.025)

    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 400)
    camera.position.set(0, 28, 60)
    camera.lookAt(0, 6, 0)

    let renderer
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
        stencil: false,
        depth: true,
      })
    } catch (_) {
      return
    }
    // Cap DPR more aggressively — retina + huge canvas was the main fps killer.
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    renderer.setPixelRatio(dpr)
    renderer.setSize(width, height)
    renderer.setClearColor(0x000000, 0)
    mount.appendChild(renderer.domElement)

    // Lighting
    scene.add(new THREE.AmbientLight(0x1c2742, 0.7))
    const moon = new THREE.DirectionalLight(0x9ec9ff, 0.55)
    moon.position.set(40, 80, 30)
    scene.add(moon)
    const cyanFill = new THREE.PointLight(0x22d3ee, 1.4, 120)
    cyanFill.position.set(-30, 25, 30)
    scene.add(cyanFill)
    const violetFill = new THREE.PointLight(0xa78bfa, 1.0, 120)
    violetFill.position.set(30, 25, -30)
    scene.add(violetFill)

    // Neon grid floor
    const gridSize = 240
    const gridDivs = 40
    const grid = new THREE.GridHelper(gridSize, gridDivs, 0x22d3ee, 0x1f3b6b)
    grid.material.transparent = true
    grid.material.opacity = 0.45
    grid.position.y = 0
    scene.add(grid)

    // Reflective ground plane (subtle)
    const groundMat = new THREE.MeshBasicMaterial({
      color: 0x040818,
      transparent: true,
      opacity: 0.85,
    })
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(gridSize, gridSize), groundMat)
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -0.02
    scene.add(ground)

    // ===== Procedural city block =====
    const buildings = []
    const windowsLayer = new THREE.Group()
    scene.add(windowsLayer)

    const cityRadius = 36
    const blockSpacing = 5
    const palette = [0x22d3ee, 0x60a5fa, 0xa78bfa, 0x38bdf8, 0x818cf8]

    for (let x = -cityRadius; x <= cityRadius; x += blockSpacing) {
      for (let z = -cityRadius; z <= cityRadius; z += blockSpacing) {
        // skip the very center for a "plaza"
        if (Math.abs(x) < 6 && Math.abs(z) < 6) continue
        // randomly skip more for streets — reduces draw calls a lot
        if (Math.random() < 0.32) continue

        const distToCenter = Math.sqrt(x * x + z * z)
        const heightBias = Math.max(0.4, 1 - distToCenter / (cityRadius * 1.2))
        const h = 2 + Math.pow(Math.random(), 1.6) * 22 * heightBias
        const w = 1.6 + Math.random() * 1.6
        const d = 1.6 + Math.random() * 1.6

        const accent = palette[Math.floor(Math.random() * palette.length)]
        const mat = new THREE.MeshPhongMaterial({
          color: 0x0a1124,
          emissive: new THREE.Color(accent),
          emissiveIntensity: 0.05 + Math.random() * 0.06,
          shininess: 60,
          specular: 0x223355,
        })
        const geo = new THREE.BoxGeometry(w, h, d)
        const b = new THREE.Mesh(geo, mat)
        b.position.set(
          x + (Math.random() - 0.5) * 0.6,
          h / 2,
          z + (Math.random() - 0.5) * 0.6,
        )
        scene.add(b)
        buildings.push({ mesh: b, baseY: h / 2, h, accent })

        // Edge glow line on top of each building
        const edgeGeo = new THREE.BoxGeometry(w * 1.02, 0.06, d * 1.02)
        const edgeMat = new THREE.MeshBasicMaterial({
          color: accent,
          transparent: true,
          opacity: 0.85,
        })
        const edge = new THREE.Mesh(edgeGeo, edgeMat)
        edge.position.copy(b.position)
        edge.position.y = h
        scene.add(edge)

        // Add window dots — only 2 faces per building, lower density.
        // Each building shares one material so all its windows update in O(1).
        const winMatShared = new THREE.MeshBasicMaterial({
          color: accent,
          transparent: true,
          opacity: 0.85,
        })
        const rows = Math.max(2, Math.floor(h / 1.4))
        for (let r = 1; r < rows; r++) {
          for (let s = 0; s < 2; s++) {
            if (Math.random() > 0.45) continue
            const winGeo = new THREE.PlaneGeometry(0.18, 0.18)
            const win = new THREE.Mesh(winGeo, winMatShared)
            const yPos = (r / rows) * h
            if (s === 0) {
              win.position.set(b.position.x + w / 2 + 0.005, yPos, b.position.z + (Math.random() - 0.5) * d * 0.6)
              win.rotation.y = Math.PI / 2
            } else {
              win.position.set(b.position.x + (Math.random() - 0.5) * w * 0.6, yPos, b.position.z + d / 2 + 0.005)
            }
            windowsLayer.add(win)
          }
        }
        buildings[buildings.length - 1].winMat = winMatShared
      }
    }

    // Central landmark tower (CityPulse HQ)
    const towerH = 36
    const tower = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, towerH, 2.2),
      new THREE.MeshPhongMaterial({
        color: 0x0b1430,
        emissive: 0x22d3ee,
        emissiveIntensity: 0.18,
        shininess: 80,
      }),
    )
    tower.position.y = towerH / 2
    scene.add(tower)

    // Tower spire / antenna with light beam
    const spire = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.18, 6, 12),
      new THREE.MeshBasicMaterial({ color: 0x60d6ff }),
    )
    spire.position.y = towerH + 3
    scene.add(spire)

    // Skyline beam (volumetric light going up)
    const beamGeo = new THREE.CylinderGeometry(0.3, 0.05, 60, 16, 1, true)
    const beamMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        color: { value: new THREE.Color(0x22d3ee) },
        time: { value: 0 },
      },
      vertexShader: `
        varying float vY;
        void main() {
          vY = position.y;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying float vY;
        uniform vec3 color;
        uniform float time;
        void main() {
          float a = smoothstep(30.0, -30.0, vY) * 0.55;
          a *= 0.85 + 0.15 * sin(time * 2.0 + vY * 0.3);
          gl_FragColor = vec4(color, a);
        }
      `,
    })
    const beam = new THREE.Mesh(beamGeo, beamMat)
    beam.position.y = towerH + 30
    scene.add(beam)

    // Rooftop blinking light on tower
    const blinker = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0xff3b6e }),
    )
    blinker.position.y = towerH + 6.2
    scene.add(blinker)

    // ===== IoT data lines (pulses traveling between buildings) =====
    const dataPulses = []
    const pulseGeo = new THREE.SphereGeometry(0.12, 8, 8)
    for (let i = 0; i < 22; i++) {
      const a = buildings[Math.floor(Math.random() * buildings.length)]
      const b = buildings[Math.floor(Math.random() * buildings.length)]
      if (!a || !b || a === b) continue
      const start = new THREE.Vector3(a.mesh.position.x, a.h + 0.5, a.mesh.position.z)
      const end = new THREE.Vector3(b.mesh.position.x, b.h + 0.5, b.mesh.position.z)
      const mid = new THREE.Vector3(
        (start.x + end.x) / 2,
        Math.max(start.y, end.y) + 6 + Math.random() * 4,
        (start.z + end.z) / 2,
      )
      const curve = new THREE.QuadraticBezierCurve3(start, mid, end)

      // arc line
      const points = curve.getPoints(40)
      const arcGeo = new THREE.BufferGeometry().setFromPoints(points)
      const arcMat = new THREE.LineBasicMaterial({
        color: i % 2 === 0 ? 0x22d3ee : 0xa78bfa,
        transparent: true,
        opacity: 0.18,
      })
      const arc = new THREE.Line(arcGeo, arcMat)
      scene.add(arc)

      // pulse traveling along curve
      const pulse = new THREE.Mesh(
        pulseGeo,
        new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? 0x7df9ff : 0xc4b5fd }),
      )
      scene.add(pulse)
      dataPulses.push({ pulse, curve, t: Math.random(), speed: 0.0025 + Math.random() * 0.004 })
    }

    // ===== Cars: small glowing dots moving along grid streets =====
    const cars = []
    const carGeo = new THREE.PlaneGeometry(0.5, 0.12)
    for (let i = 0; i < 60; i++) {
      const isHorizontal = Math.random() > 0.5
      const lane = Math.floor((Math.random() - 0.5) * 18) * blockSpacing
      const dir = Math.random() > 0.5 ? 1 : -1
      const color = dir > 0 ? 0xfde68a : 0xff6b6b
      const carMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 })
      const car = new THREE.Mesh(carGeo, carMat)
      car.rotation.x = -Math.PI / 2
      if (isHorizontal) {
        car.position.set((Math.random() - 0.5) * cityRadius * 2, 0.05, lane + 0.4 * dir)
      } else {
        car.position.set(lane + 0.4 * dir, 0.05, (Math.random() - 0.5) * cityRadius * 2)
        car.rotation.z = Math.PI / 2
      }
      scene.add(car)
      cars.push({ mesh: car, isHorizontal, dir, speed: 0.18 + Math.random() * 0.22 })
    }

    // ===== Sensor pulse rings on the ground =====
    const pulseRings = []
    for (let i = 0; i < 5; i++) {
      const ringGeo = new THREE.RingGeometry(0.4, 0.5, 32)
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x22d3ee,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
      })
      const r = new THREE.Mesh(ringGeo, ringMat)
      r.rotation.x = -Math.PI / 2
      r.position.set((Math.random() - 0.5) * cityRadius * 1.4, 0.01, (Math.random() - 0.5) * cityRadius * 1.4)
      scene.add(r)
      pulseRings.push({ mesh: r, t: Math.random() * 3 })
    }

    // Animate — frame-time aware so motion stays smooth even if FPS dips,
    // and heavy work is throttled.
    let frameId
    const startTime = performance.now()
    let lastTime = startTime
    const targetDelta = 1 / 60 // seconds — used as a normaliser for motion
    const animate = () => {
      const now = performance.now()
      const elapsed = (now - startTime) / 1000
      const dt = Math.min(0.05, (now - lastTime) / 1000) // clamp big jumps (tab switch)
      lastTime = now
      const speedScale = dt / targetDelta // 1.0 at 60fps, ~2.0 at 30fps

      // Camera slow orbit (time-based, not frame-based → buttery)
      const radius = 62
      const camY = 28 + Math.sin(elapsed * 0.15) * 3
      camera.position.x = Math.cos(elapsed * 0.08) * radius
      camera.position.z = Math.sin(elapsed * 0.08) * radius
      camera.position.y = camY
      camera.lookAt(0, 8, 0)

      // Window flicker — pick 4 random buildings per frame and tweak their
      // shared window material opacity. O(1) work instead of O(n) per frame.
      for (let k = 0; k < 4; k++) {
        const b = buildings[(Math.random() * buildings.length) | 0]
        if (b && b.winMat) b.winMat.opacity = 0.55 + Math.random() * 0.4
      }

      // Data pulses — time-based progress
      for (let i = 0; i < dataPulses.length; i++) {
        const p = dataPulses[i]
        p.t += p.speed * speedScale
        if (p.t > 1) p.t = 0
        const pos = p.curve.getPoint(p.t)
        p.pulse.position.copy(pos)
      }

      // Cars — multiply by speedScale so they move at the same real-world rate
      for (let i = 0; i < cars.length; i++) {
        const c = cars[i]
        if (c.isHorizontal) {
          c.mesh.position.x += c.dir * c.speed * speedScale
          if (c.mesh.position.x > cityRadius) c.mesh.position.x = -cityRadius
          if (c.mesh.position.x < -cityRadius) c.mesh.position.x = cityRadius
        } else {
          c.mesh.position.z += c.dir * c.speed * speedScale
          if (c.mesh.position.z > cityRadius) c.mesh.position.z = -cityRadius
          if (c.mesh.position.z < -cityRadius) c.mesh.position.z = cityRadius
        }
      }

      // Pulse rings (radar sweep) — also time-based
      for (let i = 0; i < pulseRings.length; i++) {
        const p = pulseRings[i]
        p.t += 0.018 * speedScale
        const s = (p.t % 3) * 4
        p.mesh.scale.set(s, s, s)
        p.mesh.material.opacity = Math.max(0, 0.7 - (p.t % 3) / 3)
      }

      // Tower blinker
      blinker.material.opacity = 0.5 + Math.abs(Math.sin(elapsed * 3)) * 0.5
      beamMat.uniforms.time.value = elapsed

      renderer.render(scene, camera)
      frameId = requestAnimationFrame(animate)
    }
    animate()

    const onResize = () => {
      const w = mount.clientWidth
      const h = mount.clientHeight
      renderer.setSize(w, h)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(frameId)
      window.removeEventListener('resize', onResize)
      renderer.dispose()
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose()
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose())
          else obj.material.dispose()
        }
      })
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
    }
  }, [use3D])

  // Boot progress
  useEffect(() => {
    let cancelled = false
    let p = 0
    const interval = setInterval(() => {
      if (cancelled) return
      p += Math.random() * 14 + 10
      if (p >= 100) {
        p = 100
        setProgress(100)
        clearInterval(interval)
        setTimeout(() => !cancelled && setPhase('brand'), 150)
      } else {
        setProgress(p)
        setBootIndex(Math.min(BOOT_LINES.length - 1, Math.floor((p / 100) * BOOT_LINES.length)))
      }
    }, 90)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    if (phase !== 'brand') return
    const timer = setTimeout(() => setPhase('login'), 2400)
    return () => clearTimeout(timer)
  }, [phase])

  const finishWithExit = () => {
    setExiting(true)
    setTimeout(() => onFinish(), 700)
  }

  const loginWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
  }

  useEffect(() => {
    if (phase === 'login' && hasSession) {
      const t = setTimeout(finishWithExit, 900)
      return () => clearTimeout(t)
    }
  }, [phase, hasSession])

  return (
    <div
      className={`fixed inset-0 z-[9999] overflow-hidden bg-black text-white transition-all duration-700 ${
        exiting ? 'opacity-0 scale-[1.04] blur-md' : 'opacity-100'
      }`}
    >
      {/* Night-sky gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,#0d1a3a_0%,#050a1a_45%,#020410_100%)]" />

      {/* Distant building haze */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-cyan-500/[0.06] via-transparent to-transparent" />

      {/* Subtle blueprint grid (top half) */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(125,215,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(125,215,255,0.5) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
          maskImage: 'linear-gradient(180deg, black 0%, transparent 60%)',
          WebkitMaskImage: 'linear-gradient(180deg, black 0%, transparent 60%)',
        }}
      />

      {/* Scanline */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, rgba(255,255,255,0.6) 0px, rgba(255,255,255,0.6) 1px, transparent 1px, transparent 3px)',
        }}
      />

      {/* 3D city or fallback */}
      {use3D ? (
        <div ref={mountRef} className="absolute inset-0" />
      ) : (
        <CssCityFallback />
      )}

      {/* Top status bar */}
      <div className="absolute left-0 right-0 top-0 flex items-center justify-between px-6 py-5 text-[10px] uppercase tracking-[0.4em] text-cyan-200/80 md:px-10">
        <div className="flex items-center gap-2">
          <span className="inline-block h-1.5 w-1.5 animate-ping rounded-full bg-cyan-300" />
          <span>CityPulse OS · v4.20 · LIVE FEED</span>
        </div>
        <div className="hidden gap-6 md:flex font-mono">
          <span>SECTOR 07</span>
          <span>GRID 4,205km</span>
          <span>{new Date().toISOString().split('T')[1].slice(0, 8)} UTC</span>
        </div>
      </div>

      {/* Boot progress */}
      {phase === 'boot' && (
        <div className="absolute bottom-12 left-1/2 w-[min(680px,90%)] -translate-x-1/2 text-center">
          <p className="font-mono text-[11px] tracking-[0.3em] text-cyan-200/90 animate-pulse">
            {BOOT_LINES[bootIndex]}
          </p>
          <div className="mt-3 h-[3px] overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400 shadow-[0_0_18px_rgba(96,214,255,0.7)] transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 font-mono text-[10px] tracking-[0.4em] text-white/40">
            {String(Math.floor(progress)).padStart(3, '0')}%  ·  CONNECTING TO METROPOLIS
          </p>
        </div>
      )}

      {/* Brand reveal */}
      {phase !== 'boot' && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-[0.6em] text-cyan-200/80 animate-[fadeUp_0.8s_ease-out_both]">
              Smart · City · Intelligence
            </p>
            <h1
              className="mt-3 text-5xl font-black tracking-[0.2em] md:text-7xl"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              {Array.from('CITYPULSE').map((c, i) => (
                <span
                  key={i}
                  className="inline-block bg-gradient-to-b from-white via-cyan-100 to-blue-300 bg-clip-text text-transparent drop-shadow-[0_0_25px_rgba(125,215,255,0.55)]"
                  style={{ animation: `letterReveal 0.7s ${i * 0.06 + 0.05}s ease-out both` }}
                >
                  {c}
                </span>
              ))}
            </h1>
            <div className="mx-auto mt-3 h-px w-72 bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent" />
            <p className="mt-3 text-xs tracking-[0.45em] text-white/60 animate-[fadeUp_1s_0.4s_ease-out_both]">
              URBAN  OPERATING  SYSTEM
            </p>
          </div>
        </div>
      )}

      {/* Login card */}
      {phase === 'login' && !exiting && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 animate-[fadeUp_0.8s_ease-out_both]">
          <div className="relative overflow-hidden rounded-2xl border border-cyan-300/25 bg-white/[0.03] px-7 py-5 backdrop-blur-xl shadow-[0_0_60px_rgba(40,160,255,0.25)]">
            <div className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-cyan-300/80 to-transparent" />
            {hasSession ? (
              <button
                onClick={finishWithExit}
                className="group flex items-center gap-3 text-sm font-semibold tracking-[0.3em] uppercase text-white"
              >
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-300 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" />
                </span>
                Enter the City
                <span className="ml-2 text-cyan-300 transition group-hover:translate-x-1">→</span>
              </button>
            ) : (
              <>
                <div className="flex flex-col items-center gap-3 md:flex-row md:gap-4">
                  <button
                    onClick={finishWithExit}
                    className="group flex items-center gap-3 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 px-6 py-3 text-sm font-bold tracking-wide text-gray-950 transition hover:scale-[1.02] hover:shadow-[0_0_32px_rgba(96,214,255,0.55)]"
                  >
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                    </span>
                    Enter as Guest
                    <span className="text-gray-900 transition group-hover:translate-x-1">→</span>
                  </button>
                  <button
                    onClick={loginWithGoogle}
                    className="rounded-xl border border-white/20 bg-white/[0.06] px-6 py-3 text-sm font-semibold tracking-wide text-white backdrop-blur transition hover:bg-white hover:text-gray-900"
                  >
                    Sign in with Google
                  </button>
                </div>
                <p className="mt-3 text-center text-[10px] uppercase tracking-[0.3em] text-cyan-200/60 md:text-left">
                  Sign in only required to post alerts &amp; vote
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Bottom telemetry bar */}
      <div className="absolute bottom-3 left-0 right-0 flex justify-between px-6 font-mono text-[9px] uppercase tracking-[0.35em] text-white/40 md:px-10">
        <span>NETWORK :: ONLINE</span>
        <span>NODES 12,840 / 12,840</span>
        <span>ENC AES-256</span>
      </div>

      <style>{`
        @keyframes letterReveal {
          0% { opacity: 0; transform: translateY(20px) scale(0.92); filter: blur(8px); }
          60% { opacity: 1; filter: blur(0); }
          100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }
        @keyframes fadeUp {
          0% { opacity: 0; transform: translateY(14px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

function Corners() {
  const base = 'absolute h-10 w-10 border-cyan-300/60'
  return (
    <>
      <div className={`${base} left-5 top-5 border-l-2 border-t-2`} />
      <div className={`${base} right-5 top-5 border-r-2 border-t-2`} />
      <div className={`${base} bottom-5 left-5 border-b-2 border-l-2`} />
      <div className={`${base} bottom-5 right-5 border-b-2 border-r-2`} />
    </>
  )
}

/* ---- CSS-only smart-city fallback (when WebGL unavailable) ---- */
function CssCityFallback() {
  // Generate a procedural skyline of buildings with windows
  const buildings = Array.from({ length: 28 }).map((_, i) => {
    const h = 80 + Math.random() * 240
    const w = 36 + Math.random() * 70
    const left = (i / 28) * 100 + (Math.random() - 0.5) * 1.2
    const cols = Math.max(2, Math.floor(w / 14))
    const rows = Math.max(3, Math.floor(h / 18))
    const windows = []
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (Math.random() > 0.55) continue
        windows.push({
          left: (c + 0.5) * (w / cols),
          top: 8 + r * 16,
          on: Math.random() > 0.25,
          warm: Math.random() > 0.78,
          delay: Math.random() * 4,
        })
      }
    }
    return { h, w, left, windows, accent: Math.random() > 0.5 ? '#22d3ee' : '#a78bfa' }
  })

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Stars */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(1.5px 1.5px at 12% 18%, #fff, transparent 60%),' +
            'radial-gradient(1px 1px at 25% 26%, #cfe9ff, transparent 60%),' +
            'radial-gradient(1.5px 1.5px at 60% 12%, #fff, transparent 60%),' +
            'radial-gradient(1px 1px at 80% 8%, #cfe9ff, transparent 60%),' +
            'radial-gradient(1.5px 1.5px at 38% 22%, #fff, transparent 60%),' +
            'radial-gradient(1px 1px at 92% 22%, #fff, transparent 60%),' +
            'radial-gradient(1px 1px at 7% 30%, #cfe9ff, transparent 60%)',
          opacity: 0.6,
        }}
      />

      {/* Perspective neon grid floor */}
      <div className="absolute inset-x-0 bottom-0 h-[42%] [perspective:600px]">
        <div
          className="absolute inset-0 origin-top [transform:rotateX(60deg)]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(34,211,238,0.55) 1px, transparent 1px),' +
              'linear-gradient(90deg, rgba(34,211,238,0.55) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
            maskImage: 'linear-gradient(180deg, transparent 0%, black 30%, black 100%)',
            WebkitMaskImage: 'linear-gradient(180deg, transparent 0%, black 30%, black 100%)',
            animation: 'cp-grid-flow 8s linear infinite',
          }}
        />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/80 to-transparent" />
      </div>

      {/* Buildings */}
      <div className="absolute inset-x-0 bottom-[38%] h-[44%]">
        {buildings.map((b, i) => (
          <div
            key={i}
            className="absolute bottom-0"
            style={{
              left: `${b.left}%`,
              width: `${b.w}px`,
              height: `${b.h}px`,
              background:
                'linear-gradient(180deg, rgba(10,18,40,0.9), rgba(4,8,20,0.95))',
              border: '1px solid rgba(125,215,255,0.18)',
              boxShadow:
                `inset 0 0 0 1px rgba(125,215,255,0.06), 0 0 18px ${b.accent}22`,
            }}
          >
            <div
              className="absolute -top-px left-0 right-0 h-px"
              style={{ background: b.accent, boxShadow: `0 0 10px ${b.accent}` }}
            />
            {b.windows.map((w, j) => (
              <span
                key={j}
                className="absolute h-[3px] w-[3px] rounded-[1px]"
                style={{
                  left: w.left,
                  top: w.top,
                  background: w.warm ? '#fde68a' : b.accent,
                  opacity: w.on ? 0.9 : 0.15,
                  boxShadow: w.on ? `0 0 6px ${w.warm ? '#fde68a' : b.accent}` : 'none',
                  animation: `cp-flicker ${4 + (j % 5)}s ${w.delay}s ease-in-out infinite`,
                }}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Floating data nodes */}
      <div className="absolute inset-0">
        {[...Array(12)].map((_, i) => (
          <span
            key={i}
            className="absolute h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_12px_#22d3ee]"
            style={{
              left: `${(i / 12) * 100}%`,
              top: `${20 + (i * 7) % 35}%`,
              animation: `cp-node-float ${6 + (i % 4)}s ${i * 0.3}s ease-in-out infinite`,
            }}
          />
        ))}
      </div>

      {/* Tower beam in the center */}
      <div
        className="absolute left-1/2 bottom-[38%] h-[40%] w-[3px] -translate-x-1/2 origin-bottom"
        style={{
          background: 'linear-gradient(180deg, transparent, #22d3ee 50%, transparent)',
          filter: 'blur(1px)',
          animation: 'cp-beam 3s ease-in-out infinite',
        }}
      />

      <style>{`
        @keyframes cp-grid-flow {
          0% { background-position: 0 0; }
          100% { background-position: 0 60px; }
        }
        @keyframes cp-flicker {
          0%, 100% { opacity: 0.85; }
          47% { opacity: 0.85; }
          48% { opacity: 0.25; }
          50% { opacity: 0.95; }
          52% { opacity: 0.4; }
          54% { opacity: 0.95; }
        }
        @keyframes cp-node-float {
          0%, 100% { transform: translate(0, 0); opacity: 0.85; }
          50% { transform: translate(20px, -30px); opacity: 0.4; }
        }
        @keyframes cp-beam {
          0%, 100% { opacity: 0.45; }
          50% { opacity: 0.95; }
        }
      `}</style>
    </div>
  )
}
