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
import { makeBasinPhotoPins, type BasinPhotoPin } from "../lib/basinPins";
import { layoutPhotoPins, type PhotoPinAnchor } from "../lib/photoPinLayout";
import { findBasinAt } from "../lib/basins";
import GlobeHydrology from "./GlobeHydrology";
import { createGlobeBaseTexture, createWaterbodyHighlightTexture, globeTextureWidth } from "../lib/globeTextures";

import { locations, locationById, findWaterbodyAt, locationKindNames } from "../lib/distribution";
import { useI18n } from "../i18n";

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
let savedCamera: { position: THREE.Vector3; autoFit: boolean } | null = null;
const maxCameraDistance = 16;

function setStyle(element: HTMLElement, property: "visibility" | "transform" | "zIndex" | "left" | "top", value: string) {
  if (element.style[property] !== value) element.style[property] = value;
}

function setCssProperty(element: HTMLElement, property: string, value: string) {
  if (element.style.getPropertyValue(property) !== value) element.style.setProperty(property, value);
}

function setData(element: HTMLElement, property: string, value: string) {
  if (element.dataset[property] !== value) element.dataset[property] = value;
}

function positionMarker(element: HTMLElement, x: number, y: number, origin: string) {
  // Layout stays at the overlay origin. Moving a marker only updates its
  // compositor transform, so camera motion does not relayout the whole page.
  const xText = x.toFixed(2), yText = y.toFixed(2);
  setStyle(element, "left", "0px");
  setStyle(element, "top", "0px");
  setStyle(element, "transform", `translate3d(${xText}px, ${yText}px, 0) ${origin}`);
  setData(element, "positionX", String(x));
  setData(element, "positionY", String(y));
}

function fitCameraDistance(camera: THREE.Camera, occupiedFraction: number): number {
  if (!(camera instanceof THREE.PerspectiveCamera)) return 3.1;
  const tangent = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
    * Math.min(1, camera.aspect) * occupiedFraction;
  // The sphere's silhouette, including perspective, fits the viewport's
  // shorter edge. Wide screens and narrow readers both keep the whole globe.
  return Math.min(maxCameraDistance, Math.sqrt(1 + 1 / (tangent * tangent)));
}

const overviewCameraDistance = (camera: THREE.Camera) => fitCameraDistance(camera, .94);
const detailCameraDistance = (camera: THREE.Camera) => fitCameraDistance(camera, .9);


function Scene(
  props: Props & {
    markers: React.RefObject<(HTMLButtonElement | null)[]>;
    photoMarkers: React.RefObject<(HTMLButtonElement | null)[]>;
    photoPins: BasinPhotoPin[];
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
  const emptyHighlightTexture = useMemo(() => {
    // Keep USE_MAP and the material's program stable before the first hover.
    // Both this placeholder and real masks use the same RGBA/sRGB map path.
    const empty = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1, THREE.RGBAFormat);
    empty.colorSpace = THREE.SRGBColorSpace;
    empty.needsUpdate = true;
    return empty;
  }, []);
  const photoPins = props.photoPins;
  const travel = useRef<{
    from: THREE.Vector3;
    to: THREE.Vector3;
    direction: THREE.Vector3;
    rotation: THREE.Quaternion;
    startedAt: number;
    duration: number;
    fitDetailView: boolean;
    fitOverviewView?: boolean;
  } | null>(null);
  const { region, basin, reset, onReady, onError } = props;
  const initial = useRef(true);
  const previousDetailMode = useRef(false);
  const overviewView = useRef<{ position: THREE.Vector3; filter: string; autoFit: boolean } | null>(null);
  const overviewAutoFit = useRef(savedCamera?.autoFit ?? true);
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
  const frameWork = useMemo(() => ({
    cameraDirection: new THREE.Vector3(),
    projected: new THREE.Vector3(),
    travelDirection: new THREE.Vector3(),
    travelRotation: new THREE.Quaternion(),
    regionPositions: regions.map((r) => new THREE.Vector3(...latLonToXYZ(...r.coordinates, 1.025))),
  }), []);
  const lastProjection = useRef<{
    position: THREE.Vector3;
    quaternion: THREE.Quaternion;
    projection: THREE.Matrix4;
    width: number;
    height: number;
    photoPositions: THREE.Vector3[];
    activeFishId: string | undefined;
    basin: string;
  } | null>(null);
  const projectionCount = useRef(0);
  useEffect(() => invalidate(), [photoPositions, texture, highlightTexture, invalidate]);
  useEffect(() => {
    gl.domElement.dataset.mapTextureWidth = String(texture.image.width);
    gl.domElement.dataset.mapLayer = "vector-rivers";
    gl.domElement.dataset.outlineLocation = props.highlightedLocation;
    gl.domElement.dataset.activeFish = props.activeFishId ?? "";
  }, [gl, texture, props.highlightedLocation, props.activeFishId]);
  useEffect(() => {
    const position = savedCamera?.position.clone()
      ?? new THREE.Vector3(...latLonToXYZ(105, 10, overviewCameraDistance(camera)));
    // An automatic overview retains its direction across pages, but adapts
    // its radius to the current viewport. Manual views retain their zoom too.
    if (overviewAutoFit.current) position.setLength(overviewCameraDistance(camera));
    camera.position.copy(position);
    camera.lookAt(0, 0, 0);
    onReady();
    const el = gl.domElement;
    const lost = (e: Event) => {
      e.preventDefault();
      onError();
    };
    el.addEventListener("webglcontextlost", lost);
    return () => {
      // Leaving while reading must save the original overview, not turn the
      // detail fly-to position into the next page's default globe view.
      const overview = previousDetailMode.current ? overviewView.current : null;
      savedCamera = {
        position: (overview?.position ?? camera.position).clone(),
        autoFit: overview?.autoFit ?? overviewAutoFit.current,
      };
      el.removeEventListener("webglcontextlost", lost);
    };
  }, [camera, gl, onReady, onError]);
  useEffect(() => () => texture.dispose(), [texture]);
  useEffect(() => () => highlightTexture?.dispose(), [highlightTexture]);
  useEffect(() => () => emptyHighlightTexture.dispose(), [emptyHighlightTexture]);
  // One navigation effect owns the camera. Hover only highlights the waterbody;
  // changing details replaces an unfinished flight from its current position.
  useEffect(() => {
    const detailMode = !!props.detailMode;
    const enteringDetails = detailMode && !previousDetailMode.current;
    const leavingDetails = !detailMode && previousDetailMode.current;
    const filter = `${region}:${basin}:${reset}`;
    if (enteringDetails) overviewView.current = { position: camera.position.clone(), filter, autoFit: overviewAutoFit.current };
    previousDetailMode.current = detailMode;
    gl.domElement.dataset.activeFish = props.activeFishId ?? "";

    let target: THREE.Vector3 | undefined;
    let coordinates: [number, number] | undefined;
    let duration = 0.95;
    let fitOverviewView = false;
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
      overviewAutoFit.current = overviewView.current.autoFit;
      fitOverviewView = overviewAutoFit.current;
      overviewView.current = null;
    } else if (activePoint) {
      overviewAutoFit.current = false;
      coordinates = activePoint.coordinates;
      target = new THREE.Vector3(...latLonToXYZ(...coordinates, 2.8));
    } else if (!region && !basin && focusedPhoto) {
      overviewAutoFit.current = false;
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
      overviewAutoFit.current = !b && !r;
      fitOverviewView = overviewAutoFit.current;
      const distance = b && matchMedia("(max-width: 620px)").matches ? 3.35 : b || r ? 2.8 : overviewCameraDistance(camera);
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
        startedAt: performance.now(), duration, fitDetailView: detailMode, fitOverviewView,
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
    // A layout change applies the final viewport once. Keep the current
    // flight's clock and update only its radius rather than restarting.
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
        rotation: new THREE.Quaternion(), startedAt: performance.now(), duration: 0.3, fitDetailView: true,
      };
      gl.domElement.dataset.cameraMoving = "true";
    }
    invalidate();
  }, [size.width, size.height, props.detailMode, activeLongitude, activeLatitude, camera, gl, invalidate]);
  useEffect(() => {
    if (props.detailMode || !overviewAutoFit.current) return;
    const distance = overviewCameraDistance(camera);
    if (travel.current?.fitOverviewView) {
      travel.current.to.setLength(distance);
      invalidate();
      return;
    }
    if (Math.abs(camera.position.length() - distance) < .01) return;
    const from = camera.position.clone();
    const to = from.clone().setLength(distance);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      camera.position.copy(to);
      camera.lookAt(0, 0, 0);
      controls.current?.update();
    } else {
      travel.current = {
        from, to, direction: from.clone().normalize(), rotation: new THREE.Quaternion(),
        startedAt: performance.now(), duration: .3, fitDetailView: false, fitOverviewView: true,
      };
      gl.domElement.dataset.cameraMoving = "true";
    }
    invalidate();
  }, [size.width, size.height, props.detailMode, camera, gl, invalidate]);
  useEffect(() => {
    if (controls.current) controls.current.autoRotate = props.rotate && !props.detailMode && !travel.current;
    invalidate();
  }, [props.rotate, props.detailMode, invalidate]);
  useFrame(() => {
    if (benchmark) {
      gl.domElement.dataset.renderFrames = String(gl.info.render.frame);
      setData(gl.domElement, "shaderPrograms", String(gl.info.programs?.length ?? 0));
    }
    const t = travel.current;
    if (t) {
      if (t.fitDetailView) t.to.setLength(detailCameraDistance(camera));
      else if (t.fitOverviewView) t.to.setLength(overviewCameraDistance(camera));
      // A demand-rendered canvas can sit idle between frames. Its next delta
      // includes that idle interval, so integrating it made a new flight jump
      // to its destination. Each flight owns an independent wall-clock start.
      const progress = Math.min(1, (performance.now() - t.startedAt) / (t.duration * 1000));
      const s = progress * progress * (3 - 2 * progress);
      const from = frameWork.travelDirection.copy(t.direction)
        .applyQuaternion(frameWork.travelRotation.identity().slerp(t.rotation, s));
      camera.position.copy(
        from.multiplyScalar(
          THREE.MathUtils.lerp(t.from.length(), t.to.length(), s),
        ),
      );
      camera.lookAt(0, 0, 0);
      controls.current?.update();
      if (progress >= 1) {
        travel.current = null;
        gl.domElement.dataset.cameraMoving = "false";
        if (controls.current) controls.current.autoRotate = props.rotate && !props.detailMode;
      }
      invalidate();
    }
    const previous = lastProjection.current;
    if (previous && previous.position.equals(camera.position) && previous.quaternion.equals(camera.quaternion)
      && previous.projection.equals(camera.projectionMatrix) && previous.width === size.width
      && previous.height === size.height && previous.photoPositions === photoPositions
      && previous.activeFishId === props.activeFishId && previous.basin === props.basin) return;
    // OrbitControls changes the camera before this callback; synchronize its
    // matrices before projecting DOM markers rather than waiting for render().
    camera.updateMatrixWorld();
    if (previous) {
      previous.position.copy(camera.position);
      previous.quaternion.copy(camera.quaternion);
      previous.projection.copy(camera.projectionMatrix);
      previous.width = size.width; previous.height = size.height;
      previous.photoPositions = photoPositions;
      previous.activeFishId = props.activeFishId; previous.basin = props.basin;
    } else lastProjection.current = {
      position: camera.position.clone(), quaternion: camera.quaternion.clone(),
      projection: camera.projectionMatrix.clone(), width: size.width, height: size.height,
      photoPositions, activeFishId: props.activeFishId, basin: props.basin,
    };
    if (benchmark) setData(gl.domElement, "markerLayouts", String(++projectionCount.current));
    const cameraDistance = camera.position.length();
    setData(gl.domElement, "cameraLongitude", String(Math.atan2(-camera.position.z, camera.position.x) * 180 / Math.PI));
    setData(gl.domElement, "cameraLatitude", String(Math.asin(camera.position.y / cameraDistance) * 180 / Math.PI));
    setData(gl.domElement, "cameraDistance", String(cameraDistance));
    if (camera instanceof THREE.PerspectiveCamera) {
      setData(gl.domElement, "cameraFov", String(camera.fov));
      setData(gl.domElement, "cameraAspect", String(camera.aspect));
    }
    regions.forEach((_r, i) => {
      const button = props.markers.current[i];
      if (!button) return;
      const pos = frameWork.projected.copy(frameWork.regionPositions[i]);
      const visible = pos.dot(camera.position) > 1.035;
      setStyle(button, "visibility", visible ? "visible" : "hidden");
      const tabIndex = visible ? 0 : -1;
      if (button.tabIndex !== tabIndex) button.tabIndex = tabIndex;
      if (!visible) return;
      pos.project(camera);
      positionMarker(button, (pos.x + 1) * size.width / 2, (1 - pos.y) * size.height / 2, "translate(-50%, -17px)");
    });
    const cameraDirection = frameWork.cameraDirection.copy(camera.position).normalize();
    // R3F already observes its container. Reading the DOM rect here, after
    // moving 183 photos in the previous frame, used to force synchronous layout.
    const { width, height } = size;
    const mobile = window.innerWidth <= 620;
    const anchors: PhotoPinAnchor[] = [];
    const visibleButtons = new Map<string, HTMLButtonElement>();
    photoPositions.forEach((position, index) => {
      const button = props.photoMarkers.current[index];
      if (!button) return;
      const facing = position.dot(cameraDirection) / 1.006;
      const projected = frameWork.projected.copy(position).project(camera);
      // Surface visibility follows the sphere horizon, not an elevated halo.
      const inView = facing > 1 / cameraDistance + .01 && Math.abs(projected.x) <= 1 && Math.abs(projected.y) <= 1;
      setStyle(button, "visibility", inView ? "visible" : "hidden");
      const tabIndex = inView ? 0 : -1;
      if (button.tabIndex !== tabIndex) button.tabIndex = tabIndex;
      if (!inView) return;
      const anchorX = (projected.x + 1) * width / 2;
      const anchorY = (1 - projected.y) * height / 2;
      const key = photoPins[index].key;
      anchors.push({ key, groupId: photoPins[index].basinId, x: anchorX, y: anchorY, facing });
      visibleButtons.set(key, button);
      setStyle(button, "zIndex", photoPins[index].fish.id === props.activeFishId ? "1000" : String(Math.round(facing * 100) + 100));
    });
    const positioned = layoutPhotoPins(anchors, {
      width, height, mobile,
      diameter: props.basin ? (mobile ? 32 : 44) : (mobile ? 26 : 32),
      minDiameter: props.basin ? (mobile ? 24 : 30) : (mobile ? 20 : 24),
      maxOffset: props.basin ? (mobile ? 48 : 72) : (mobile ? 34 : 48),
    });
    for (const pin of positioned) {
      const button = visibleButtons.get(pin.key)!;
      const dx = -pin.offsetX, dy = -pin.offsetY;
      positionMarker(button, pin.x, pin.y, "translate(-50%, -50%)");
      setCssProperty(button, "--pin-diameter", `${pin.diameter}px`);
      setCssProperty(button, "--leader-length", `${Math.hypot(dx, dy)}px`);
      setCssProperty(button, "--leader-x", `${dx}px`);
      setCssProperty(button, "--leader-y", `${dy}px`);
      setCssProperty(button, "--leader-angle", `${Math.atan2(dy, dx)}rad`);
      setData(button, "anchorX", String(pin.anchorX));
      setData(button, "anchorY", String(pin.anchorY));
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
      <mesh scale={1.001} renderOrder={1} raycast={() => {}}>
        <sphereGeometry args={[1, 192, 128]} />
        <meshBasicMaterial map={highlightTexture ?? emptyHighlightTexture} transparent depthWrite={false} />
      </mesh>
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
        maxDistance={maxCameraDistance}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.5}
        zoomSpeed={0.6}
        autoRotate={props.rotate && !props.detailMode}
        autoRotateSpeed={0.3}
        onStart={() => {
          travel.current = null;
          overviewAutoFit.current = false;
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
  const { locale, t, fishName, locationName, regionName } = useI18n();
  const photoPins = useMemo(() => makeBasinPhotoPins(props.fish, props.basin), [props.fish, props.basin]);
  // Text changes only with data or language; geographic projection stays outside i18n.
  const pinLabels = useMemo(() => photoPins.map((pin) => ({
    fish: fishName(pin.fish.item),
    location: locationById.get(pin.basinId) ? locationName(locationById.get(pin.basinId)!) : "",
  })), [photoPins, locale, fishName, locationName]);
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
          aria-label={t("交互式地球，默认显示全球主要河流；点击陆地或选择水域可查看范围与鱼种")}
          dpr={[1, 2]}
          resize={{ offsetSize: true, debounce: 0 }}
          frameloop={!visible ? "never" : props.rotate ? "always" : "demand"}
          camera={{ position: [2.7, 1, -1.8], fov: 40, near: 0.1, far: 50 }}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: "high-performance",
            precision: "highp",
          }}
          fallback={<span>{t("请使用图鉴列表浏览")}</span>}
        >
          <Suspense fallback={null}>
            <Scene {...props} photoPins={photoPins} markers={markers} photoMarkers={photoMarkers} highlightedLocation={highlightedLocation} />
          </Suspense>
        </Canvas>
      </Boundary>
      <div className="photo-pin-overlay" aria-label={t("地球上的鱼类照片")}>
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
            aria-label={t("查看{name}图鉴，{location}关联展示点", { name: pinLabels[index].fish, location: pinLabels[index].location })}
            title={t("{name} · {location}（水域展示位置，非观测点）", { name: pinLabels[index].fish, location: pinLabels[index].location })}
          >
            <img src={pin.fish.photo.path} alt="" loading="lazy" decoding="async" />
            <span className="pin-tooltip"><strong>{pinLabels[index].fish}</strong><small>{t("原生水域 · {location}", { location: pinLabels[index].location })}</small></span>
          </button>
        ))}
      </div>
      {highlighted && <div className="globe-waterbody-context" role="status">
        <span>{t(locationKindNames[highlighted.kind])}</span>
        <strong>{locationName(highlighted)}</strong>
        <small>{t("{count} 种鱼集中展示 · 对应水域已高亮", { count: highlightedCount })}</small>
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
            aria-label={t("探索{name}，{count}种有照片的鱼", { name: regionName(r), count: species.length })}
            style={{ "--marker-color": r.color } as React.CSSProperties}
          >
            <span className="marker-ring"><i /></span>
            <span className="marker-label">{regionName(r)}<b>{species.length}</b></span>
          </button>
          );
        })}
      </div>
    </div>
  );
}
