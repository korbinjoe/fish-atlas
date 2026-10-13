import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  Component,
} from "react";
import type { ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import land from "../../content/enrichment/globe-land.json";
import type { GeoPermissibleObjects } from "d3-geo";
import type { Occurrence } from "../lib/evidence";
import { establishmentColors } from "../lib/evidence";
import { latLonToXYZ, regions } from "../lib/model";
import type { RegionId } from "../lib/model";
import type { Fish } from "../lib/model";
import type { PhotoProfile } from "../lib/photoProfiles";
import type { ExploreSpecies } from "../lib/exploreProfiles";
import { makeBasinPhotoPins } from "../lib/basinPins";
import { layoutPhotoPins, type PhotoPinAnchor } from "../lib/photoPinLayout";
import { findBasinAt } from "../lib/basins";
import GlobeHydrology from "./GlobeHydrology";
import { createGlobeBaseTexture, createWaterbodyHighlightTexture, globeTextureWidth } from "../lib/globeTextures";

import { locations, locationById, findWaterbodyAt, locationKindNames } from "../lib/distribution";

type Props = {
  region: string;
  onRegion: (id: RegionId) => void;
  basin: string;
  onBasin: (id: string) => void;
  fish: ExploreSpecies[];
  onFish: (fish: Fish | PhotoProfile) => void;
  activeFishId?: string;
  detailMode?: boolean;
  reset: number;
  rotate: boolean;
  onReady: () => void;
  onError: () => void;
  occurrences: Occurrence[];
  activeOccurrence: string;
  onOccurrence: (id: string) => void;
};
let savedCamera: THREE.Vector3 | null = null;

function detailCameraDistance(camera: THREE.Camera): number {
  if (!(camera instanceof THREE.PerspectiveCamera)) return 3.1;
  const verticalHalfAngle = THREE.MathUtils.degToRad(camera.fov / 2);
  const limitingHalfAngle = Math.atan(Math.tan(verticalHalfAngle) * Math.min(1, camera.aspect));
  // Fit the sphere's angular radius into the narrower viewport dimension,
  // with a small rim around it. Side-by-side reading keeps the whole globe.
  return THREE.MathUtils.clamp(1.03 / Math.sin(limitingHalfAngle), 3.1, 4.5);
}


function Scene(
  props: Props & {
    markers: React.RefObject<(HTMLButtonElement | null)[]>;
    photoMarkers: React.RefObject<(HTMLButtonElement | null)[]>;
    highlightedLocation: string;
  },
) {
  const { camera, gl, invalidate, size } = useThree();
  const controls = useRef<React.ComponentRef<typeof OrbitControls>>(null);
  const texture = useMemo(() => createGlobeBaseTexture(
    land as GeoPermissibleObjects, locations,
    globeTextureWidth(gl.capabilities.maxTextureSize, matchMedia("(max-width: 620px)").matches),
    Math.min(16, gl.capabilities.getMaxAnisotropy()),
  ), [gl]);
  const highlightTexture = useMemo(() => createWaterbodyHighlightTexture(locationById.get(props.highlightedLocation)),
    [props.highlightedLocation]);
  const photoPins = useMemo(() => makeBasinPhotoPins(props.fish, props.basin), [props.fish, props.basin]);
  const travel = useRef<{
    from: THREE.Vector3;
    to: THREE.Vector3;
    direction: THREE.Vector3;
    rotation: THREE.Quaternion;
    t: number;
    duration: number;
    fitDetailView: boolean;
  } | null>(null);
  const { region, basin, reset, onReady, onError } = props;
  const initial = useRef(true);
  const previousDetailMode = useRef(false);
  const overviewView = useRef<{ position: THREE.Vector3; filter: string } | null>(null);
  const activePin = photoPins.find((pin) => pin.fish.id === props.activeFishId);
  const activeLongitude = activePin?.coordinates[0];
  const activeLatitude = activePin?.coordinates[1];
  const activePoint = props.occurrences.find((point) => point.id === props.activeOccurrence);
  const focusedPhoto = photoPins.length === 1 ? photoPins[0] : undefined;
  const benchmark = useMemo(
    () => new URLSearchParams(window.location.search).has("benchmark"),
    [],
  );
  const photoPositions = useMemo(() => photoPins.map((pin) =>
    new THREE.Vector3(...latLonToXYZ(...pin.coordinates, 1.006))), [photoPins]);
  useEffect(() => invalidate(), [photoPositions, texture, highlightTexture, invalidate]);
  useEffect(() => {
    gl.domElement.dataset.mapTextureWidth = String(texture.image.width);
    gl.domElement.dataset.mapLayer = "vector-rivers";
    gl.domElement.dataset.outlineLocation = props.highlightedLocation;
    gl.domElement.dataset.activeFish = props.activeFishId ?? "";
  }, [gl, texture, props.highlightedLocation, props.activeFishId]);
  useEffect(() => {
    camera.position.copy(
      savedCamera ?? new THREE.Vector3(...latLonToXYZ(105, 10, 3.35)),
    );
    camera.lookAt(0, 0, 0);
    onReady();
    const el = gl.domElement;
    const lost = (e: Event) => {
      e.preventDefault();
      onError();
    };
    el.addEventListener("webglcontextlost", lost);
    return () => {
      savedCamera = camera.position.clone();
      el.removeEventListener("webglcontextlost", lost);
    };
  }, [camera, gl, onReady, onError]);
  useEffect(() => () => texture.dispose(), [texture]);
  useEffect(() => () => highlightTexture?.dispose(), [highlightTexture]);
  // One navigation effect owns the camera. Hover only highlights the waterbody;
  // changing details replaces an unfinished flight from its current position.
  useEffect(() => {
    const detailMode = !!props.detailMode;
    const enteringDetails = detailMode && !previousDetailMode.current;
    const leavingDetails = !detailMode && previousDetailMode.current;
    const filter = `${region}:${basin}:${reset}`;
    if (enteringDetails) overviewView.current = { position: camera.position.clone(), filter };
    previousDetailMode.current = detailMode;
    gl.domElement.dataset.activeFish = props.activeFishId ?? "";

    let target: THREE.Vector3 | undefined;
    let coordinates: [number, number] | undefined;
    let duration = 0.95;
    if (detailMode) {
      // No fallback region is invented when the active fish has no mapped pin.
      if (activeLongitude === undefined || activeLatitude === undefined) {
        travel.current = null;
        gl.domElement.dataset.cameraMoving = "false";
        gl.domElement.dataset.cameraTargetFish = "";
        delete gl.domElement.dataset.cameraTargetLongitude;
        delete gl.domElement.dataset.cameraTargetLatitude;
        invalidate();
        return;
      }
      coordinates = [activeLongitude, activeLatitude];
      target = new THREE.Vector3(...latLonToXYZ(...coordinates, detailCameraDistance(camera)));
      duration = enteringDetails ? 0.95 : 0.7;
    } else if (leavingDetails && overviewView.current?.filter === filter) {
      target = overviewView.current.position.clone();
      overviewView.current = null;
    } else if (activePoint) {
      coordinates = activePoint.coordinates;
      target = new THREE.Vector3(...latLonToXYZ(...coordinates, 2.8));
    } else if (!region && !basin && focusedPhoto) {
      coordinates = focusedPhoto.coordinates;
      target = new THREE.Vector3(...latLonToXYZ(...coordinates, 3.1));
    } else {
      if (initial.current && !region && !basin && reset === 0) {
        initial.current = false;
        gl.domElement.dataset.cameraMoving = "false";
        return;
      }
      const r = regions.find((item) => item.id === region);
      const b = locationById.get(basin);
      coordinates = b?.center ?? r?.coordinates ?? [105, 10];
      const distance = b && matchMedia("(max-width: 620px)").matches ? 3.35 : b || r ? 2.8 : 3.35;
      target = new THREE.Vector3(...latLonToXYZ(...coordinates, distance));
    }
    initial.current = false;
    gl.domElement.dataset.cameraTargetFish = detailMode ? props.activeFishId ?? "" : "";
    if (coordinates) {
      gl.domElement.dataset.cameraTargetLongitude = String(coordinates[0]);
      gl.domElement.dataset.cameraTargetLatitude = String(coordinates[1]);
    } else {
      delete gl.domElement.dataset.cameraTargetLongitude;
      delete gl.domElement.dataset.cameraTargetLatitude;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      travel.current = null;
      camera.position.copy(target);
      camera.lookAt(0, 0, 0);
      controls.current?.update();
      gl.domElement.dataset.cameraMoving = "false";
    } else {
      const from = camera.position.clone();
      travel.current = {
        from, to: target, direction: from.clone().normalize(),
        rotation: new THREE.Quaternion().setFromUnitVectors(from.clone().normalize(), target.clone().normalize()),
        t: 0, duration, fitDetailView: detailMode,
      };
      if (controls.current) controls.current.autoRotate = false;
      gl.domElement.dataset.cameraMoving = "true";
    }
    invalidate();
  }, [props.detailMode, props.activeFishId, activeLongitude, activeLatitude,
    region, basin, reset, props.activeOccurrence, activePoint?.coordinates[0], activePoint?.coordinates[1],
    focusedPhoto?.key, focusedPhoto?.coordinates[0], focusedPhoto?.coordinates[1], camera, gl, invalidate]);
  useEffect(() => {
    if (!props.detailMode || activeLongitude === undefined || activeLatitude === undefined) return;
    const distance = detailCameraDistance(camera);
    // CSS changes the viewport throughout the opening transition. Keep the
    // current flight's clock and update only its radius rather than restarting.
    if (travel.current?.fitDetailView) {
      travel.current.to.setLength(distance);
      invalidate();
      return;
    }
    if (Math.abs(camera.position.length() - distance) < 0.01) return;
    const from = camera.position.clone();
    const to = from.clone().setLength(distance);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      camera.position.copy(to);
      camera.lookAt(0, 0, 0);
      controls.current?.update();
    } else {
      // Later window resizes zoom smoothly without changing a manually chosen
      // direction or turning the selected fish into a new geographical point.
      travel.current = {
        from, to, direction: from.clone().normalize(),
        rotation: new THREE.Quaternion(), t: 0, duration: 0.3, fitDetailView: true,
      };
      gl.domElement.dataset.cameraMoving = "true";
    }
    invalidate();
  }, [size.width, size.height, props.detailMode, activeLongitude, activeLatitude, camera, gl, invalidate]);
  useEffect(() => {
    if (controls.current) controls.current.autoRotate = props.rotate && !props.detailMode && !travel.current;
    invalidate();
  }, [props.rotate, props.detailMode, invalidate]);
  useFrame((_, delta) => {
    if (benchmark)
      gl.domElement.dataset.renderFrames = String(gl.info.render.frame);
    const t = travel.current;
    if (t) {
      if (t.fitDetailView) t.to.setLength(detailCameraDistance(camera));
      t.t = Math.min(1, t.t + delta / t.duration);
      const s = t.t * t.t * (3 - 2 * t.t);
      const from = t.direction.clone().applyQuaternion(new THREE.Quaternion().slerp(t.rotation, s));
      camera.position.copy(
        from.multiplyScalar(
          THREE.MathUtils.lerp(t.from.length(), t.to.length(), s),
        ),
      );
      camera.lookAt(0, 0, 0);
      controls.current?.update();
      if (t.t >= 1) {
        travel.current = null;
        gl.domElement.dataset.cameraMoving = "false";
        if (controls.current) controls.current.autoRotate = props.rotate && !props.detailMode;
      }
      invalidate();
    }
    gl.domElement.dataset.cameraLongitude = String(Math.atan2(-camera.position.z, camera.position.x) * 180 / Math.PI);
    gl.domElement.dataset.cameraLatitude = String(Math.asin(camera.position.clone().normalize().y) * 180 / Math.PI);
    gl.domElement.dataset.cameraDistance = String(camera.position.length());
    regions.forEach((r, i) => {
      const button = props.markers.current[i];
      if (!button) return;
      const pos = new THREE.Vector3(...latLonToXYZ(...r.coordinates, 1.025));
      const visible = pos.dot(camera.position) > 1.035;
      button.style.visibility = visible ? "visible" : "hidden";
      button.tabIndex = visible ? 0 : -1;
      pos.project(camera);
      button.style.left = `${(pos.x + 1) * 50}%`;
      button.style.top = `${(1 - pos.y) * 50}%`;
    });
    const cameraDirection = camera.position.clone().normalize();
    const rect = gl.domElement.getBoundingClientRect();
    const mobile = matchMedia("(max-width: 620px)").matches;
    const anchors: PhotoPinAnchor[] = [];
    const visibleButtons = new Map<string, HTMLButtonElement>();
    photoPositions.forEach((position, index) => {
      const button = props.photoMarkers.current[index];
      if (!button) return;
      const facing = position.clone().normalize().dot(cameraDirection);
      const projected = position.clone().project(camera);
      // Surface visibility follows the sphere horizon, not an elevated halo.
      const inView = facing > 1 / camera.position.length() + .01 && Math.abs(projected.x) <= 1 && Math.abs(projected.y) <= 1;
      button.style.visibility = inView ? "visible" : "hidden";
      button.tabIndex = inView ? 0 : -1;
      if (!inView) return;
      const anchorX = (projected.x + 1) * rect.width / 2;
      const anchorY = (1 - projected.y) * rect.height / 2;
      const key = photoPins[index].key;
      anchors.push({ key, groupId: photoPins[index].basinId, x: anchorX, y: anchorY, facing });
      visibleButtons.set(key, button);
      button.style.zIndex = photoPins[index].fish.id === props.activeFishId ? "1000" : String(Math.round(facing * 100) + 100);
    });
    const positioned = layoutPhotoPins(anchors, {
      width: rect.width, height: rect.height, mobile,
      diameter: props.basin ? (mobile ? 32 : 44) : (mobile ? 26 : 32),
      minDiameter: props.basin ? (mobile ? 24 : 30) : (mobile ? 20 : 24),
      maxOffset: props.basin ? (mobile ? 48 : 72) : (mobile ? 34 : 48),
    });
    for (const pin of positioned) {
      const button = visibleButtons.get(pin.key)!;
      const dx = -pin.offsetX, dy = -pin.offsetY;
      button.style.left = `${pin.x}px`; button.style.top = `${pin.y}px`;
      button.style.setProperty("--pin-diameter", `${pin.diameter}px`);
      button.style.setProperty("--leader-length", `${Math.hypot(dx, dy)}px`);
      button.style.setProperty("--leader-x", `${dx}px`);
      button.style.setProperty("--leader-y", `${dy}px`);
      button.style.setProperty("--leader-angle", `${Math.atan2(dy, dx)}rad`);
      button.dataset.anchorX = String(pin.anchorX);
      button.dataset.anchorY = String(pin.anchorY);
    }
  });
  return (
    <>
      <ambientLight intensity={1.25} />
      <directionalLight position={[3, 4, 5]} intensity={2.4} color="#d5e8d8" />
      <directionalLight position={[-4, 0, -3]} intensity={1} color="#2c838c" />
      <mesh onClick={(event) => {
        if (event.delta > 6) return;
        const point = event.point.clone().normalize();
        const longitude = Math.atan2(-point.z, point.x) * 180 / Math.PI;
        const latitude = Math.asin(point.y) * 180 / Math.PI;
        const selected = findWaterbodyAt(longitude, latitude) ?? findBasinAt(longitude, latitude);
        if (selected) {
          event.stopPropagation();
          props.onBasin(selected.id);
        }
      }}>
        <sphereGeometry args={[1, 192, 128]} />
        <meshPhongMaterial map={texture} shininess={14} specular="#426c75" />
      </mesh>
      {highlightTexture && <mesh scale={1.001} renderOrder={1} raycast={() => {}}>
        <sphereGeometry args={[1, 192, 128]} />
        <meshBasicMaterial map={highlightTexture} transparent depthWrite={false} />
      </mesh>}
      <GlobeHydrology highlightedLocation={locationById.get(props.highlightedLocation)} land={land as GeoPermissibleObjects} />
      <mesh scale={1.017}>
        <sphereGeometry args={[1, 64, 48]} />
        <shaderMaterial
          transparent
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          uniforms={{}}
          vertexShader={
            "varying vec3 n; varying vec3 v; void main(){n=normalize(normalMatrix*normal); vec4 p=modelViewMatrix*vec4(position,1.);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}"
          }
          fragmentShader={
            "varying vec3 n; varying vec3 v; void main(){float a=pow(1.-abs(dot(n,v)),3.);gl_FragColor=vec4(.2,.7,.7,a*.38);}"
          }
        />
      </mesh>
      {props.occurrences.map((o) => (
        <mesh
          key={o.id}
          position={latLonToXYZ(...o.coordinates, 1.018)}
          onClick={(e) => {
            e.stopPropagation();
            if (e.delta <= 6) props.onOccurrence(o.id);
          }}
        >
          <sphereGeometry
            args={[o.id === props.activeOccurrence ? 0.022 : 0.013, 12, 8]}
          />
          <meshBasicMaterial color={establishmentColors[o.establishment]} />
        </mesh>
      ))}
      <OrbitControls
        ref={controls}
        enablePan={false}
        minDistance={1.8}
        maxDistance={4.5}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.5}
        zoomSpeed={0.6}
        autoRotate={props.rotate && !props.detailMode}
        autoRotateSpeed={0.3}
        onStart={() => {
          travel.current = null;
          gl.domElement.dataset.cameraMoving = "false";
        }}
      />
    </>
  );
}
class Boundary extends Component<
  { children: ReactNode; onError: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
export default function Globe(props: Props) {
  const photoPins = useMemo(() => makeBasinPhotoPins(props.fish, props.basin), [props.fish, props.basin]);
  const [hoveredLocation, setHoveredLocation] = useState("");
  const [focusedLocation, setFocusedLocation] = useState("");
  const activeLocation = props.detailMode ? photoPins.find((pin) => pin.fish.id === props.activeFishId)?.basinId : undefined;
  const highlightedLocation = [activeLocation, hoveredLocation, focusedLocation, props.basin]
    .find((id) => id && photoPins.some((pin) => pin.basinId === id)) ?? props.basin;
  const highlighted = locationById.get(highlightedLocation);
  const highlightedCount = photoPins.filter((pin) => pin.basinId === highlightedLocation).length;
  const [visible, setVisible] = useState(!document.hidden);
  const [supported] = useState(() => {
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl2");
      if (!gl) return false;
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      return true;
    } catch {
      return false;
    }
  });
  const markers = useRef<(HTMLButtonElement | null)[]>([]);
  const photoMarkers = useRef<(HTMLButtonElement | null)[]>([]);
  useEffect(() => {
    if (!supported) props.onError();
  }, [supported, props.onError]);
  useEffect(() => {
    const on = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", on);
    return () => document.removeEventListener("visibilitychange", on);
  }, []);
  if (!supported) return null;
  return (
    <div className="globe-renderer" data-highlighted-location={highlightedLocation} data-detail-mode={!!props.detailMode}>
      <Boundary onError={props.onError}>
        <Canvas
          aria-label="交互式地球，默认显示全球主要河流；点击陆地或选择水域可查看范围与鱼种"
          dpr={[1, 2]}
          frameloop={!visible ? "never" : props.rotate ? "always" : "demand"}
          camera={{ position: [2.7, 1, -1.8], fov: 40, near: 0.1, far: 50 }}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: "high-performance",
            precision: "highp",
          }}
          fallback={<span>请使用图鉴列表浏览</span>}
        >
          <Suspense fallback={null}>
            <Scene {...props} markers={markers} photoMarkers={photoMarkers} highlightedLocation={highlightedLocation} />
          </Suspense>
        </Canvas>
      </Boundary>
      <div className="photo-pin-overlay" aria-label="地球上的鱼类照片">
        {photoPins.map((pin, index) => (
          <button
            key={pin.key}
            ref={(element) => { photoMarkers.current[index] = element; }}
            className="globe-fish-pin regional"
            data-fish-id={pin.fish.id}
            data-selected={pin.fish.id === props.activeFishId}
            data-basin-id={pin.basinId}
            data-waterbody-kind={locationById.get(pin.basinId)?.kind}
            data-longitude={pin.coordinates[0]}
            data-latitude={pin.coordinates[1]}
            data-waterbody-active={highlightedLocation === pin.basinId}
            data-muted={props.detailMode && props.activeFishId ? pin.fish.id !== props.activeFishId : !!highlightedLocation && highlightedLocation !== pin.basinId}
            onMouseEnter={() => setHoveredLocation(pin.basinId)}
            onMouseLeave={() => setHoveredLocation("")}
            onFocus={() => setFocusedLocation(pin.basinId)}
            onBlur={() => setFocusedLocation("")}
            onClick={() => props.onFish(pin.fish.item)}
            aria-pressed={pin.fish.id === props.activeFishId}
            aria-label={`查看${pin.fish.name}图鉴，${locationById.get(pin.basinId)?.label}关联展示点`}
            title={`${pin.fish.name} · ${locationById.get(pin.basinId)?.label}（水域展示位置，非观测点）`}
          >
            <img src={pin.fish.photo.path} alt="" loading="lazy" decoding="async" />
            <span className="pin-tooltip"><strong>{pin.fish.name}</strong><small>原生水域 · {locationById.get(pin.basinId)?.label}</small></span>
          </button>
        ))}
      </div>
      {highlighted && <div className="globe-waterbody-context" role="status">
        <span>{locationKindNames[highlighted.kind]}</span>
        <strong>{highlighted.label}</strong>
        <small>{highlightedCount} 种鱼集中展示 · 对应水域已高亮</small>
      </div>}
      <div className="marker-overlay">
        {!props.basin && regions.map((r, i) => {
          const species = props.fish.filter((fish) => fish.region === r.id);
          return (
          <button
            key={r.id}
            ref={(el) => {
              markers.current[i] = el;
            }}
            className={`map-marker ${r.id === props.region ? "active" : ""}`}
            onClick={() => props.onRegion(r.id)}
            aria-label={`探索${r.name}，${species.length}种有照片的鱼`}
            style={{ "--marker-color": r.color } as React.CSSProperties}
          >
            <span className="marker-ring"><i /></span>
            <span className="marker-label">{r.name}<b>{species.length}</b></span>
          </button>
          );
        })}
      </div>
    </div>
  );
}
