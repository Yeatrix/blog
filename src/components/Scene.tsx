'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';

// Paths to your models (put the files in public/models/).
// Set to null to use the plain cube / dark plane instead.
const PLAYER_MODEL_URL: string | null = '/models/player.gltf';
const PLAYER_SIZE = 1.5; // desired height of the model in world units

// Procedural anime grass (no model files)
const GRASS_RADIUS = 40;     // how far the grass field extends from the center
const PLAY_RADIUS = 30;      // how far the player can walk from the center
const GRASS_COUNT = 150000;   // number of blades (one draw call regardless)
const GRASS_HEIGHT = 1.0;    // average blade height in world units
const COLOR_BLADE_BASE = 0x2d6a1e; // blade color at the root
const COLOR_BLADE_TIP = 0x8fd94e;  // blade color at the tip (the anime "glow")

const HUT_MODEL_URL: string | null = '/177-medieval-hut.glb';
const HUT_SIZE = 12; // desired height of the hut in world units

export default function Scene({ onFirstMove }: { onFirstMove?: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const joyBaseRef = useRef<HTMLDivElement>(null);
  const joyKnobRef = useRef<HTMLDivElement>(null);
  // joystick output, read by the animation loop: x = turn, y = forward/back, each in [-1, 1]
  const joyRef = useRef({ x: 0, y: 0 });
  // kept in a ref so the effect (and scene) never needs to re-run when the prop changes
  const onFirstMoveRef = useRef(onFirstMove);
  onFirstMoveRef.current = onFirstMove;
  const hasMovedRef = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // --- Renderer ---
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    // --- Scene & Camera ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    // fog wall must swallow the field edge from any reachable camera spot:
    // worst case is player at PLAY_RADIUS looking outward → edge is
    // (GRASS_RADIUS - PLAY_RADIUS + DIST_MAX) from the camera; keep far below that
    // near→far is the fade band: keep it wide so the fog feels like
    // atmosphere, not a wall. far must stay ≤ (GRASS_RADIUS - PLAY_RADIUS + DIST_MAX)
    scene.fog = new THREE.Fog(0x000000, 14, 40);

    const camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      200
    );

    // --- Starry sky: points on a huge dome, twinkling via shader ---
    const STAR_COUNT = 3000;
    const starPos = new Float32Array(STAR_COUNT * 3);
    const starSizes = new Float32Array(STAR_COUNT);
    const starPhases = new Float32Array(STAR_COUNT);
    const starColors = new Float32Array(STAR_COUNT * 3);
    const starPalette = [
      new THREE.Color(0xffffff), // white (most stars)
      new THREE.Color(0xffffff),
      new THREE.Color(0xffffff),
      new THREE.Color(0xbfd8ff), // blue-ish
      new THREE.Color(0xffe9c4), // warm yellow
    ];
    const dir = new THREE.Vector3();
    for (let i = 0; i < STAR_COUNT; i++) {
      // random direction above the horizon, pushed to a dome inside camera.far
      dir.set(Math.random() * 2 - 1, Math.random() * 0.9 + 0.05, Math.random() * 2 - 1)
        .normalize()
        .multiplyScalar(180);
      starPos.set([dir.x, dir.y, dir.z], i * 3);
      starSizes[i] = 1 + Math.random() * 2.2;      // pixel size
      starPhases[i] = Math.random() * Math.PI * 2; // twinkle offset
      const c = starPalette[Math.floor(Math.random() * starPalette.length)];
      starColors.set([c.r, c.g, c.b], i * 3);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute('aSize', new THREE.BufferAttribute(starSizes, 1));
    starGeo.setAttribute('aPhase', new THREE.BufferAttribute(starPhases, 1));
    starGeo.setAttribute('aColor', new THREE.BufferAttribute(starColors, 3));

    const starMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { uTime: { value: 0 } },
      vertexShader: /* glsl */ `
        attribute float aSize;
        attribute float aPhase;
        attribute vec3 aColor;
        uniform float uTime;
        varying vec3 vColor;
        varying float vTwinkle;

        void main() {
          vColor = aColor;
          // each star pulses on its own rhythm
          vTwinkle = 0.55 + 0.45 * sin(uTime * 1.5 + aPhase);
          gl_PointSize = aSize * (0.75 + 0.25 * vTwinkle);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vColor;
        varying float vTwinkle;

        void main() {
          // round point with a soft edge instead of a square
          float d = length(gl_PointCoord - 0.5);
          if (d > 0.5) discard;
          float glow = smoothstep(0.5, 0.0, d);
          gl_FragColor = vec4(vColor, glow * vTwinkle);
        }
      `,
    });

    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // --- Lights ---
    // const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    // scene.add(ambient);

    RectAreaLightUniformsLib.init(); // required once for RectAreaLight to render correctly
    const areaLight = new THREE.RectAreaLight(0xffbda0, 5, 12, 12);
    areaLight.position.set(-14, 18, 8);          // high, off to the side
    areaLight.lookAt(0, HUT_SIZE / 2, 0);        // aim at the middle of the hut
    scene.add(areaLight);

    
    const lampLight = new THREE.SpotLight(0xffd2af, 200);

    lampLight.position.set(4, 5, 6);
    lampLight.angle = Math.PI/2
    lampLight.penumbra = 1;
    lampLight.decay = 2;
    lampLight.distance = 8;

    lampLight.target.position.set(0, 0, 0);
    scene.add(lampLight);
    scene.add(lampLight.target);
    // --- Grass texture (shared by the ground plane and the blades) ---
    const texLoader = new THREE.TextureLoader();

    const groundTex = texLoader.load('/textures/grass.jpg');
    groundTex.wrapS = THREE.RepeatWrapping;
    groundTex.wrapT = THREE.RepeatWrapping;
    groundTex.repeat.set(12, 12); // tiling density on the ground
    groundTex.colorSpace = THREE.SRGBColorSpace;

    const fieldTex = texLoader.load('/textures/grass.jpg');
    fieldTex.colorSpace = THREE.SRGBColorSpace;

    // --- Ground plane (textured soil under the blades) ---
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(GRASS_RADIUS + 5, 48),
      new THREE.MeshLambertMaterial({ map: groundTex, color: 0xbbbbbb })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // --- Anime grass: instanced blades with a gradient + wind shader ---
    // One tapered blade, instanced GRASS_COUNT times = a single draw call.
    const blade = new THREE.PlaneGeometry(0.14, GRASS_HEIGHT, 1, 3);
    blade.translate(0, GRASS_HEIGHT / 2, 0); // root at y = 0

    const grassGeo = new THREE.InstancedBufferGeometry();
    grassGeo.index = blade.index;
    grassGeo.setAttribute('position', blade.getAttribute('position'));
    grassGeo.setAttribute('uv', blade.getAttribute('uv'));
    grassGeo.instanceCount = GRASS_COUNT;

    const offsets = new Float32Array(GRASS_COUNT * 3);
    const angles = new Float32Array(GRASS_COUNT);
    const scales = new Float32Array(GRASS_COUNT);
    const tints = new Float32Array(GRASS_COUNT);
    for (let i = 0; i < GRASS_COUNT; i++) {
      // random point in a circle (sqrt for even density)
      const r = Math.sqrt(Math.random()) * GRASS_RADIUS;
      const a = Math.random() * Math.PI * 2;
      offsets[i * 3] = Math.cos(a) * r;
      offsets[i * 3 + 1] = 0;
      offsets[i * 3 + 2] = Math.sin(a) * r;
      angles[i] = Math.random() * Math.PI * 2;
      scales[i] = 0.6 + Math.random() * 0.8;
      tints[i] = Math.random();
    }
    grassGeo.setAttribute('aOffset', new THREE.InstancedBufferAttribute(offsets, 3));
    grassGeo.setAttribute('aAngle', new THREE.InstancedBufferAttribute(angles, 1));
    grassGeo.setAttribute('aScale', new THREE.InstancedBufferAttribute(scales, 1));
    grassGeo.setAttribute('aTint', new THREE.InstancedBufferAttribute(tints, 1));

    const grassMat = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      fog: true,
      uniforms: {
        uTime: { value: 0 },
        uBase: { value: new THREE.Color(COLOR_BLADE_BASE) },
        uTip: { value: new THREE.Color(COLOR_BLADE_TIP) },
        uMap: { value: fieldTex },
        uRadius: { value: GRASS_RADIUS },
        ...THREE.UniformsLib.fog,
      },
      vertexShader: /* glsl */ `
        attribute vec3 aOffset;
        attribute float aAngle;
        attribute float aScale;
        attribute float aTint;
        uniform float uTime;
        uniform float uRadius;
        varying float vH;
        varying float vTint;
        varying vec2 vFieldUv;
        #include <fog_pars_vertex>

        void main() {
          vH = uv.y;
          vTint = aTint;
          // where this blade stands in the field, mapped to 0..1 texture coords
          vFieldUv = (aOffset.xz / uRadius) * 0.5 + 0.5;

          vec3 pos = position;
          pos.x *= 1.0 - 0.85 * uv.y;   // taper toward the tip
          pos *= aScale;                 // per-blade size variation

          // rotate the blade around Y so they don't all face one way
          float c = cos(aAngle), s = sin(aAngle);
          pos = vec3(c * pos.x + s * pos.z, pos.y, -s * pos.x + c * pos.z);

          // wind: tips sway, roots stay planted
          float sway = sin(uTime * 1.6 + aOffset.x * 0.8 + aOffset.z * 0.6)
                     + 0.5 * sin(uTime * 3.1 + aOffset.z);
          float bend = sway * 0.12 * vH * vH;
          pos.x += bend;
          pos.z += bend * 0.6;

          pos += aOffset;
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uBase;
        uniform vec3 uTip;
        uniform sampler2D uMap;
        varying float vH;
        varying float vTint;
        varying vec2 vFieldUv;
        #include <fog_pars_fragment>

        void main() {
          vec3 col = mix(uBase, uTip, vH);      // root → tip gradient
          // paint the field with the image: each blade picks up the color
          // of the texture at its position (brighter toward the tip)
          vec3 fieldCol = texture2D(uMap, vFieldUv).rgb;
          col = mix(col, fieldCol * (0.6 + 0.6 * vH), 0.5);
          col *= 0.88 + vTint * 0.24;           // subtle per-blade variation
          gl_FragColor = vec4(col, 1.0);
          #include <fog_fragment>
        }
      `,
    });

    const grass = new THREE.Mesh(grassGeo, grassMat);
    grass.frustumCulled = false; // instances spread beyond the base geometry's bounds
    scene.add(grass);

    // --- Hut (scene centerpiece) ---
    if (HUT_MODEL_URL) {
      new GLTFLoader().load(
        HUT_MODEL_URL,
        (gltf) => {
          const hut = gltf.scene;

          // normalize: scale to HUT_SIZE tall, centered at origin, base on the floor
          const bounds = new THREE.Box3().setFromObject(hut);
          const size = bounds.getSize(new THREE.Vector3());
          const scale = HUT_SIZE / size.y;
          hut.scale.setScalar(scale);

          bounds.setFromObject(hut);
          const center = bounds.getCenter(new THREE.Vector3());
          hut.position.x -= center.x;
          hut.position.z -= center.z;
          hut.position.y -= bounds.min.y + 1;

          hut.traverse((o) => {
            if ((o as THREE.Mesh).isMesh) {
              o.castShadow = true;
              o.receiveShadow = true;
            }
          });

          scene.add(hut);
        },
        undefined,
        (err) => console.warn('Hut model failed to load:', err)
      );
    }

    // --- Player ---
    // The movement/camera code drives this group; the visual (cube or GLTF
    // model) lives inside it, so swapping visuals never touches the logic.
    const box = new THREE.Group();
    box.position.z = 20; // spawn in front of the hut, not inside it
    scene.add(box);

    const cube = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: 0xadc178 })
    );
    cube.position.y = 0.5;
    cube.castShadow = true;
    box.add(cube);

    if (PLAYER_MODEL_URL) {
      new GLTFLoader().load(
        PLAYER_MODEL_URL,
        (gltf) => {
          const model = gltf.scene;

          // normalize: scale to PLAYER_SIZE tall, feet on the floor, centered
          const bounds = new THREE.Box3().setFromObject(model);
          const size = bounds.getSize(new THREE.Vector3());
          const scale = PLAYER_SIZE / size.y;
          model.scale.setScalar(scale);

          bounds.setFromObject(model); // recompute after scaling
          const center = bounds.getCenter(new THREE.Vector3());
          model.position.x -= center.x;
          model.position.z -= center.z;
          model.position.y -= bounds.min.y;

          model.traverse((o) => {
            if ((o as THREE.Mesh).isMesh) o.castShadow = true;
          });

          box.remove(cube); // model loaded — drop the placeholder cube
          box.add(model);
        },
        undefined,
        (err) => console.warn('Player model failed to load, keeping cube:', err)
      );
    }

    // --- WASD movement state ---
    const keys: Record<string, boolean> = {};
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.startsWith('Arrow')) e.preventDefault();
      keys[e.key.toLowerCase()] = true;
    };
    const onKeyUp = (e: KeyboardEvent) => { keys[e.key.toLowerCase()] = false; };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    const SPEED = 6;        // units per second
    const TURN_SPEED = 2.5; // radians per second
    const cameraGoal = new THREE.Vector3();
    const lookTarget = new THREE.Vector3();

    // --- Mouse orbit + zoom state ---
    // camYaw is an offset relative to the box's facing; camPitch is elevation angle
    let camYaw = 0;
    let camPitch = 0.36;  // radians above horizontal
    let camDist = 9;
    const PITCH_MIN = 0; // keeps camera above the floor
    const PITCH_MAX = 1.45; // just short of straight overhead
    const DIST_MIN = 3;
    const DIST_MAX = 30; // capped so the camera can never see past the fog to the field edge

    // Active pointers on the canvas: 1 = orbit drag, 2 = pinch zoom
    const pointers = new Map<number, { x: number; y: number }>();
    let lastX = 0, lastY = 0;
    let pinchStartDist = 0;
    let pinchStartCamDist = 0;

    // stop the browser from scrolling/zooming the page while touching the scene
    renderer.domElement.style.touchAction = 'none';

    const onPointerDown = (e: PointerEvent) => {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      renderer.domElement.setPointerCapture(e.pointerId);
      if (pointers.size === 1) {
        lastX = e.clientX;
        lastY = e.clientY;
      } else if (pointers.size === 2) {
        const [p1, p2] = [...pointers.values()];
        pinchStartDist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
        pinchStartCamDist = camDist;
      }
    };
    const onPointerMove = (e: PointerEvent) => {
      const p = pointers.get(e.pointerId);
      if (!p) return;
      p.x = e.clientX;
      p.y = e.clientY;

      if (pointers.size === 1) {
        // orbit
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;
        camYaw -= dx * 0.005;
        camPitch = THREE.MathUtils.clamp(camPitch + dy * 0.005, PITCH_MIN, PITCH_MAX);
      } else if (pointers.size === 2) {
        // pinch zoom
        const [p1, p2] = [...pointers.values()];
        const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
        if (dist > 0) {
          camDist = THREE.MathUtils.clamp(
            pinchStartCamDist * (pinchStartDist / dist),
            DIST_MIN,
            DIST_MAX
          );
        }
      }
    };
    const onPointerUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      renderer.domElement.releasePointerCapture(e.pointerId);
      // returning from pinch to one finger: reset drag anchor to avoid a jump
      if (pointers.size === 1) {
        const [p] = [...pointers.values()];
        lastX = p.x;
        lastY = p.y;
      }
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      camDist = THREE.MathUtils.clamp(camDist + e.deltaY * 0.01, DIST_MIN, DIST_MAX);
    };
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('pointercancel', onPointerUp);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false });

    // --- Resize handling ---
    const onResize = () => {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', onResize);

    // --- Animation loop ---
    const clock = new THREE.Clock();
    let rafId = 0;

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);
      grassMat.uniforms.uTime.value += dt; // wind
      starMat.uniforms.uTime.value += dt;  // twinkle

      // A/D or ←/→ turn the box, W/S or ↑/↓ move along the direction it faces.
      // The joystick contributes analog values in the same ranges.
      let turn = 0;
      if (keys['a'] || keys['arrowleft']) turn += 1;
      if (keys['d'] || keys['arrowright']) turn -= 1;
      turn -= joyRef.current.x; // push right = turn right
      box.rotation.y += THREE.MathUtils.clamp(turn, -1, 1) * TURN_SPEED * dt;

      let move = 0;
      if (keys['w'] || keys['arrowup']) move += 1;
      if (keys['s'] || keys['arrowdown']) move -= 1;
      move += joyRef.current.y; // push up = forward
      move = THREE.MathUtils.clamp(move, -1, 1);

      // notify the page once, the first time the player moves or turns
      if (!hasMovedRef.current && (move !== 0 || turn !== 0)) {
        hasMovedRef.current = true;
        onFirstMoveRef.current?.();
      }
      if (move !== 0) {
        // forward is -Z rotated by the box's yaw
        box.position.x -= Math.sin(box.rotation.y) * move * SPEED * dt;
        box.position.z -= Math.cos(box.rotation.y) * move * SPEED * dt;

        // invisible fence: keep the player well inside the field so the
        // grass edge always stays hidden behind the fog
        const distFromCenter = Math.hypot(box.position.x, box.position.z);
        if (distFromCenter > PLAY_RADIUS) {
          const k = PLAY_RADIUS / distFromCenter;
          box.position.x *= k;
          box.position.z *= k;
        }
      }

      // camera orbits the box: behind its facing direction + user drag offset,
      // at user-controlled pitch and zoom distance
      const totalYaw = box.rotation.y + camYaw;
      const hDist = camDist * Math.cos(camPitch);
      const vDist = camDist * Math.sin(camPitch);
      cameraGoal.set(
        box.position.x + Math.sin(totalYaw) * hDist,
        box.position.y + vDist,
        box.position.z + Math.cos(totalYaw) * hDist
      );
      camera.position.lerp(cameraGoal, 0.08);

      lookTarget.copy(box.position);
      lookTarget.y += 0.5;
      camera.lookAt(lookTarget);

      renderer.render(scene, camera);
    };
    animate();

    // --- Cleanup ---
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('wheel', onWheel);
      // pmrem.dispose();
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, []);

  // --- Joystick (touch devices only) ---
  const JOY_TRAVEL = 40; // max knob offset in px

  const moveKnob = (clientX: number, clientY: number) => {
    const base = joyBaseRef.current;
    const knob = joyKnobRef.current;
    if (!base || !knob) return;
    const rect = base.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const len = Math.hypot(dx, dy);
    if (len > JOY_TRAVEL) {
      dx = (dx / len) * JOY_TRAVEL;
      dy = (dy / len) * JOY_TRAVEL;
    }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    joyRef.current = { x: dx / JOY_TRAVEL, y: -dy / JOY_TRAVEL };
  };

  const resetKnob = () => {
    if (joyKnobRef.current) joyKnobRef.current.style.transform = 'translate(0px, 0px)';
    joyRef.current = { x: 0, y: 0 };
  };

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <style>{`
        .joystick { display: none; }
        @media (pointer: coarse) {
          .joystick { display: flex; }
        }
      `}</style>
      <div
        ref={joyBaseRef}
        className="joystick"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          moveKnob(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) moveKnob(e.clientX, e.clientY);
        }}
        onPointerUp={resetKnob}
        onPointerCancel={resetKnob}
        style={{
          position: 'absolute',
          left: 28,
          bottom: 28,
          width: 120,
          height: 120,
          borderRadius: '50%',
          background: 'rgba(240, 234, 210, 0.08)',
          border: '1.5px solid rgba(240, 234, 210, 0.25)',
          alignItems: 'center',
          justifyContent: 'center',
          touchAction: 'none',
          zIndex: 10,
          userSelect: 'none',
        }}
      >
        <div
          ref={joyKnobRef}
          style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            background: 'rgba(240, 234, 210, 0.35)',
            border: '1.5px solid rgba(240, 234, 210, 0.5)',
            pointerEvents: 'none',
            transition: 'transform 0.05s linear',
          }}
        />
      </div>
    </div>
  );
}
