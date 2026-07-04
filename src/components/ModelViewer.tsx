'use client';

import { useRef } from 'react';

const MV = 'model-viewer' as unknown as React.ElementType;

export default function ModelViewer({
  src,
  width = '100%',
  height = '100%',
}: {
  src: string;
  width?: number | string;
  height?: number | string;
}) {
  const w = typeof width === 'number' ? `${width}px` : width;
  const h = typeof height === 'number' ? `${height}px` : height;
  const containerRef = useRef<HTMLDivElement>(null);

  const logCamera = () => {
    const v = containerRef.current?.querySelector('model-viewer') as any;
    if (!v) { console.warn('model-viewer not found'); return; }

    const orbit = v.getCameraOrbit();
    const target = v.getCameraTarget();
    const fov = v.getFieldOfView();

    const orbitStr = `${Math.round(orbit.theta * 180 / Math.PI)}deg ${Math.round(orbit.phi * 180 / Math.PI)}deg ${orbit.radius.toFixed(3)}m`;
    const targetStr = `${target.x.toFixed(3)}m ${target.y.toFixed(3)}m ${target.z.toFixed(3)}m`;

    console.log('--- 📷 copy into ModelViewer.tsx ---');
    console.log(`'camera-orbit': '${orbitStr}',`);
    console.log(`'camera-target': '${targetStr}',`);
    console.log(`'max-field-of-view': '${fov.toFixed(1)}deg',`);
  };


  return (
    <div ref={containerRef} style={{ position: 'relative', width: w, height: h }}>
      <MV
        src={src}
        alt="3D model"
        {...{
          'camera-controls': true,
          'camera-orbit': '-13deg 77deg 10.987m',
          'camera-target': '-0.581m 0.921m 1.811m',
          'shadow-intensity': '1',
          'exposure': '1',
          'min-field-of-view': '1deg',
          'max-field-of-view': '4deg',
          'interpolation-decay': '200',
        }}
        style={{ width: '100%', height: '100%', background: 'transparent' }}
      />

      {/* DEV ONLY — remove once you have your position */}
      <button
        onClick={logCamera}
        style={{
          position: 'absolute',
          bottom: 16,
          right: 16,
          zIndex: 10,
          padding: '8px 14px',
          background: 'rgba(108,88,76,0.85)',
          color: '#F0EAD2',
          border: '1px solid rgba(240,234,210,0.3)',
          borderRadius: 8,
          fontSize: 12,
          cursor: 'pointer',
          fontFamily: 'monospace',
        }}
      >
        📷 Save Camera
      </button>
    </div>
  );
}
