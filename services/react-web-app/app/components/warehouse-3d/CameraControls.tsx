import { useRef, useEffect } from 'react';
import { OrbitControls as OrbitControlsImpl } from 'three/examples/jsm/controls/OrbitControls.js';
import { useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

interface CameraControlsProps {
  target?: [number, number, number];
  enableRotate?: boolean;
  enableZoom?: boolean;
  enablePan?: boolean;
  minDistance?: number;
  maxDistance?: number;
  maxPolarAngle?: number;
  autoRotate?: boolean;
  autoRotateSpeed?: number;
}

export function CameraControls({
  target = [0, 0, 0],
  enableRotate = true,
  enableZoom = true,
  enablePan = true,
  minDistance = 5,
  maxDistance = 150,
  maxPolarAngle = Math.PI / 2.1,
  autoRotate = false,
  autoRotateSpeed = 0.5,
}: CameraControlsProps) {
  return (
    <OrbitControls
      target={target}
      enableRotate={enableRotate}
      enableZoom={enableZoom}
      enablePan={enablePan}
      minDistance={minDistance}
      maxDistance={maxDistance}
      maxPolarAngle={maxPolarAngle}
      autoRotate={autoRotate}
      autoRotateSpeed={autoRotateSpeed}
      makeDefault
    />
  );
}

interface FirstPersonControlsProps {
  speed?: number;
  lookSpeed?: number;
  position?: [number, number, number];
}

export function FirstPersonControls({
  speed = 10,
  lookSpeed = 0.002,
  position = [0, 5, 10]
}: FirstPersonControlsProps) {
  const { camera, gl } = useThree();
  const moveState = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
    up: false,
    down: false,
  });

  const velocity = useRef(new THREE.Vector3());
  const direction = useRef(new THREE.Vector3());

  useEffect(() => {
    camera.position.set(...position);

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key.toLowerCase()) {
        case 'w':
        case 'arrowup':
          moveState.current.forward = true;
          break;
        case 's':
        case 'arrowdown':
          moveState.current.backward = true;
          break;
        case 'a':
        case 'arrowleft':
          moveState.current.left = true;
          break;
        case 'd':
        case 'arrowright':
          moveState.current.right = true;
          break;
        case 'q':
          moveState.current.down = true;
          break;
        case 'e':
          moveState.current.up = true;
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.key.toLowerCase()) {
        case 'w':
        case 'arrowup':
          moveState.current.forward = false;
          break;
        case 's':
        case 'arrowdown':
          moveState.current.backward = false;
          break;
        case 'a':
        case 'arrowleft':
          moveState.current.left = false;
          break;
        case 'd':
        case 'arrowright':
          moveState.current.right = false;
          break;
        case 'q':
          moveState.current.down = false;
          break;
        case 'e':
          moveState.current.up = false;
          break;
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement === gl.domElement) {
        const euler = new THREE.Euler(0, 0, 0, 'YXZ');
        euler.setFromQuaternion(camera.quaternion);
        euler.y -= e.movementX * lookSpeed;
        euler.x -= e.movementY * lookSpeed;
        euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, euler.x));
        camera.quaternion.setFromEuler(euler);
      }
    };

    const handleClick = () => {
      gl.domElement.requestPointerLock();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    gl.domElement.addEventListener('click', handleClick);
    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      gl.domElement.removeEventListener('click', handleClick);
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [camera, gl, lookSpeed]);

  useFrame((_, delta) => {
    const state = moveState.current;

    direction.current.set(
      Number(state.right) - Number(state.left),
      Number(state.up) - Number(state.down),
      Number(state.backward) - Number(state.forward)
    );

    direction.current.normalize();

    velocity.current.set(0, 0, 0);

    if (state.forward || state.backward) {
      const forward = new THREE.Vector3();
      camera.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();
      velocity.current.add(
        forward.multiplyScalar((state.forward ? -1 : 1) * speed * delta)
      );
    }

    if (state.left || state.right) {
      const right = new THREE.Vector3();
      camera.getWorldDirection(right);
      right.cross(camera.up);
      right.y = 0;
      right.normalize();
      velocity.current.add(
        right.multiplyScalar((state.right ? 1 : -1) * speed * delta)
      );
    }

    if (state.up || state.down) {
      velocity.current.y += (state.up ? 1 : -1) * speed * delta;
    }

    camera.position.add(velocity.current);
  });

  return null;
}
