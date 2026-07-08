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

    let dragging = false;
    let lastX = 0, lastY = 0;

    const onPointerDown = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      renderer.domElement.setPointerCapture(e.pointerId);
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      camYaw -= dx * 0.005;
      camPitch = THREE.MathUtils.clamp(camPitch + dy * 0.005, PITCH_MIN, PITCH_MAX);
    };
    const onPointerUp = (e: PointerEvent) => {
      dragging = false;
      renderer.domElement.releasePointerCapture(e.pointerId);
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      camDist = THREE.MathUtils.clamp(camDist + e.deltaY * 0.01, DIST_MIN, DIST_MAX);
    };
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
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

      // A/D or ←/→ turn the box, W/S or ↑/↓ move along the direction it faces
      if (keys['a'] || keys['arrowleft']) box.rotation.y += TURN_SPEED * dt;
      if (keys['d'] || keys['arrowright']) box.rotation.y -= TURN_SPEED * dt;

      let move = 0;
      if (keys['w'] || keys['arrowup']) move += 1;
      if (keys['s'] || keys['arrowdown']) move -= 1;
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

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
