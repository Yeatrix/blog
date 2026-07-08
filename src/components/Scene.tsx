'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Path to your player model (put the file in public/models/).
// Set to null to use the plain cube instead.
const PLAYER_MODEL_URL: string | null = '/models/player.gltf';
const PLAYER_SIZE = 1.5; // desired height of the model in world units

export default function Scene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const joyBaseRef = useRef<HTMLDivElement>(null);
  const joyKnobRef = useRef<HTMLDivElement>(null);
  // joystick output, read by the animation loop: x = turn, y = forward/back, each in [-1, 1]
  const joyRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // --- Renderer ---
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // --- Scene & Camera ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    scene.fog = new THREE.Fog(0x000000, 30, 80);

    const camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      200
    );

    // --- Lights ---
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffffff, 1.2);
    sun.position.set(10, 20, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -30;
    sun.shadow.camera.right = 30;
    sun.shadow.camera.top = 30;
    sun.shadow.camera.bottom = -30;
    scene.add(sun);

    // --- Floor ---
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 100),
      new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Grid lines so movement is visible
    const grid = new THREE.GridHelper(100, 100, 0x333333, 0x1c1c1c);
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.6;
    scene.add(grid);

    // --- Player ---
    // The movement/camera code drives this group; the visual (cube or GLTF
    // model) lives inside it, so swapping visuals never touches the logic.
    const box = new THREE.Group();
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
    let camPitch = 0.55;  // radians above horizontal
    let camDist = 9;
    const PITCH_MIN = 0.12; // keeps camera above the floor
    const PITCH_MAX = 1.45; // just short of straight overhead
    const DIST_MIN = 3;
    const DIST_MAX = 25;

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
      if (move !== 0) {
        // forward is -Z rotated by the box's yaw
        box.position.x -= Math.sin(box.rotation.y) * move * SPEED * dt;
        box.position.z -= Math.cos(box.rotation.y) * move * SPEED * dt;
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
