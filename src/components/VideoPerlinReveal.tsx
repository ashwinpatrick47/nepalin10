"use client";

import * as React from "react";
import * as THREE from "three";
import SiteImage from "@/components/SiteImage";
import { useReducedMotion } from "framer-motion";

// Ported from the Framer Marketplace "Video Perlin Reveal" component's
// actual source (the user supplied it directly) — same shaders, same
// classic Stefan Gustavson 3D Perlin noise + radial-gradient reveal, same
// scroll-progress math. Stripped out what only exists inside Framer Sites
// itself (`addPropertyControls`/`ControlType`/`useIsStaticRenderer` from
// the "framer" package — there's no such runtime here) and swapped
// THREE.VideoTexture for a plain THREE.TextureLoader image texture, since
// this project doesn't have a scenic video asset yet; the video path is
// still here, commented where it'd slot back in, for whenever one exists.
const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  precision highp float;

  uniform sampler2D uTexture;
  uniform float uTime;
  uniform float uProgress;
  uniform float uClearProgress;
  uniform vec2 uRes;
  uniform vec2 uMediaRes;
  uniform float uNoiseSpeed;
  uniform float uNoiseScale;
  uniform float uRadialStrength;
  uniform float uRadialOffset;
  uniform float uNoiseDamp;

  varying vec2 vUv;

  /* Classic Perlin 3D Noise by Stefan Gustavson */
  vec4 permute(vec4 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
  vec3 fade(vec3 t) { return t*t*t*(t*(t*6.0-15.0)+10.0); }

  float cnoise(vec3 P) {
    vec3 Pi0 = floor(P);
    vec3 Pi1 = Pi0 + vec3(1.0);
    Pi0 = mod(Pi0, 289.0);
    Pi1 = mod(Pi1, 289.0);
    vec3 Pf0 = fract(P);
    vec3 Pf1 = Pf0 - vec3(1.0);
    vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
    vec4 iy = vec4(Pi0.yy, Pi1.yy);
    vec4 iz0 = Pi0.zzzz;
    vec4 iz1 = Pi1.zzzz;

    vec4 ixy = permute(permute(ix) + iy);
    vec4 ixy0 = permute(ixy + iz0);
    vec4 ixy1 = permute(ixy + iz1);

    vec4 gx0 = ixy0 / 7.0;
    vec4 gy0 = fract(floor(gx0) / 7.0) - 0.5;
    gx0 = fract(gx0);
    vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
    vec4 sz0 = step(gz0, vec4(0.0));
    gx0 -= sz0 * (step(0.0, gx0) - 0.5);
    gy0 -= sz0 * (step(0.0, gy0) - 0.5);

    vec4 gx1 = ixy1 / 7.0;
    vec4 gy1 = fract(floor(gx1) / 7.0) - 0.5;
    gx1 = fract(gx1);
    vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
    vec4 sz1 = step(gz1, vec4(0.0));
    gx1 -= sz1 * (step(0.0, gx1) - 0.5);
    gy1 -= sz1 * (step(0.0, gy1) - 0.5);

    vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);
    vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
    vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);
    vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
    vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);
    vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
    vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);
    vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);

    vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
    g000 *= norm0.x; g010 *= norm0.y; g100 *= norm0.z; g110 *= norm0.w;
    vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
    g001 *= norm1.x; g011 *= norm1.y; g101 *= norm1.z; g111 *= norm1.w;

    float n000 = dot(g000, Pf0);
    float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
    float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
    float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
    float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
    float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
    float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
    float n111 = dot(g111, Pf1);

    vec3 fade_xyz = fade(Pf0);
    vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
    vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
    float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x);
    return 2.2 * n_xyz;
  }

  vec2 CoverUV(vec2 u, vec2 s, vec2 i) {
    float rs = s.x / s.y;
    float ri = i.x / i.y;
    vec2 st = rs < ri ? vec2(i.x * s.y / i.y, s.y) : vec2(s.x, i.y * s.x / i.x);
    vec2 o = (rs < ri ? vec2((st.x - s.x) / 2.0, 0.0) : vec2(0.0, (st.y - s.y) / 2.0)) / st;
    return u * s / st + o;
  }

  void main() {
    vec2 newUv = CoverUV(vUv, uRes, uMediaRes);

    vec2 displacedUv = vUv + cnoise(vec3(vUv * uNoiseScale, uTime * uNoiseSpeed));
    // Damped — the raw noise term's amplitude is large enough relative to
    // the clamp below that certain moments in its animation produced a
    // sharp, jagged "crown" of teeth around the edge instead of the
    // intended soft undulation. uNoiseDamp is 0.6 on desktop and lower on
    // narrow viewports, where the tighter radial strength (see
    // handleResize) makes the same noise amplitude look relatively more
    // jagged against the smaller blob.
    float strength = cnoise(vec3(displacedUv * uNoiseScale, uTime * uNoiseSpeed * 2.0)) * uNoiseDamp;

    float radialGradient = distance(vUv, vec2(0.5)) * uRadialStrength - uRadialOffset * uProgress;
    strength += radialGradient;

    strength = clamp(strength, 0.0, 1.0);

    // Once the reveal itself is done, keep fading the whole frame toward
    // fully clear over its own separate (and much longer) stretch of
    // continued scrolling, instead of leaving the noise/fog permanently
    // confined to an organic "portal" shape — by the end the video should
    // read clean, with no smoke left anywhere in frame. uClearProgress
    // tracks real scroll distance past that point, not a slice of the
    // already-short uProgress range, so this plays out gradually.
    strength = mix(strength, 0.0, uClearProgress);

    strength = 1.0 - strength;

    vec3 mediaColor = texture2D(uTexture, newUv).rgb;
    float opacityProgress = smoothstep(0.0, 0.7, uProgress);

    gl_FragColor = vec4(mediaColor, strength * opacityProgress);
  }
`;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const isVideoSrc = (src: string) => /\.(mp4|webm|mov)$/i.test(src);

export default function VideoPerlinReveal({
  src,
  scrollThreshold = 0.1,
  noiseSpeed = 0.1,
  noiseScale = 5.0,
  radialStrength = 14,
  radialOffset = 6,
  alt = "",
  children,
}: {
  src: string;
  scrollThreshold?: number;
  noiseSpeed?: number;
  noiseScale?: number;
  radialStrength?: number;
  radialOffset?: number;
  alt?: string;
  children?: React.ReactNode;
}) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const reduceMotion = useReducedMotion();
  const isVideo = isVideoSrc(src);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container || reduceMotion) return;

    let destroyed = false;
    let rafId = 0;
    let videoEl: HTMLVideoElement | null = null;
    const targetProgress = { current: 0 };
    const currentProgress = { current: 0 };
    const targetClearProgress = { current: 0 };
    const currentClearProgress = { current: 0 };

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      50,
      container.clientWidth / container.clientHeight,
      0.001,
      1000,
    );
    camera.position.z = 2;

    const uniforms = {
      uTexture: { value: null as THREE.Texture | null },
      uTime: { value: 0 },
      uProgress: { value: 0 },
      uClearProgress: { value: 0 },
      uRes: { value: new THREE.Vector2(1, 1) },
      uMediaRes: { value: new THREE.Vector2(1, 1) },
      uNoiseSpeed: { value: noiseSpeed },
      uNoiseScale: { value: noiseScale },
      uRadialStrength: { value: radialStrength },
      uRadialOffset: { value: radialOffset },
      uNoiseDamp: { value: 0.6 },
    };

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
      transparent: true,
      side: THREE.DoubleSide,
    });
    const geometry = new THREE.PlaneGeometry(1, 1, 1, 1);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    let mediaAspect = 1;
    // Deliberately not setting colorSpace = SRGBColorSpace on either media
    // path below: that makes the GPU decode the sRGB-encoded source to
    // linear on sample, but three.js only auto re-encodes that back to
    // sRGB for its built-in materials via an injected shader chunk — a raw
    // ShaderMaterial like this one never gets that encode, so the decode
    // alone was leaving every pixel darkened (verified: the rendered color
    // exactly matched a single sRGB→linear decode of the source with no
    // re-encode). Leaving colorSpace unset passes the stored bytes
    // straight through, correct here since nothing in this shader does
    // linear lighting math that would need the decode in the first place.
    if (isVideo) {
      const video = document.createElement("video");
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.autoplay = true;
      video.preload = "auto";
      video.crossOrigin = "anonymous";
      video.src = src;
      videoEl = video;

      video.addEventListener("loadedmetadata", () => {
        if (destroyed) return;
        const texture = new THREE.VideoTexture(video);
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        mediaAspect = video.videoWidth / video.videoHeight;
        uniforms.uMediaRes.value.set(video.videoWidth, video.videoHeight);
        uniforms.uTexture.value = texture;
        handleResize();
        video.play().catch(() => {});
      });
      video.load();
    } else {
      new THREE.TextureLoader().load(src, (texture) => {
        if (destroyed) return;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        const image = texture.image as HTMLImageElement;
        mediaAspect = image.width / image.height;
        uniforms.uMediaRes.value.set(image.width, image.height);
        uniforms.uTexture.value = texture;
        handleResize();
      });
    }

    function handleResize() {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();

      const fov = 50;
      const distance = camera.position.z;
      const vFov = (fov * Math.PI) / 180;
      const planeHeight = 2 * Math.tan(vFov / 2) * distance;
      const planeWidth = planeHeight * (w / h);

      // Full-bleed cover, matching this section's "big, hero-scale" brief
      // rather than the component's letterboxed default.
      mesh.scale.set(planeWidth, planeHeight, 1);
      uniforms.uRes.value.set(planeWidth, planeHeight);
      void mediaAspect;

      // Enlarged (0.9x) everywhere now, not just on narrow viewports — the
      // original radius read as too small/uncaptivating against this
      // footage (more uniform cloud coverage) on both desktop and mobile.
      const isMobileWidth = w < 700;
      uniforms.uRadialStrength.value = radialStrength * 0.9;

      // The tighter mobile radius above makes the same noise amplitude
      // read as more jagged against a smaller blob, so damp it further
      // there specifically.
      uniforms.uNoiseDamp.value = isMobileWidth ? 0.42 : 0.6;
    }
    window.addEventListener("resize", handleResize);

    handleResize();

    function handleScroll() {
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const elementCenter = rect.top + rect.height / 2;
      const viewportCenter = windowHeight / 2;

      const startPoint = windowHeight;
      const endPoint = viewportCenter;

      let scrollProgress: number;
      if (elementCenter >= startPoint) {
        scrollProgress = 0;
      } else if (elementCenter <= endPoint) {
        scrollProgress = 1;
      } else {
        scrollProgress = (startPoint - elementCenter) / (startPoint - endPoint);
      }

      if (scrollProgress >= scrollThreshold) {
        const mapped = (scrollProgress - scrollThreshold) / (1 - scrollThreshold);
        targetProgress.current = Math.max(0, Math.min(1, mapped));
      }

      // Independent of the reveal above (which finishes within about half a
      // viewport height of scroll) — tracks real scroll distance past that
      // point, over a much longer stretch, so the fade to fully clear reads
      // as a deliberate, gradual change rather than the smoke vanishing
      // almost as soon as it appeared.
      const clearDistance = windowHeight * 1.4;
      const clearRaw =
        elementCenter <= endPoint ? (endPoint - elementCenter) / clearDistance : 0;
      targetClearProgress.current = Math.max(0, Math.min(1, clearRaw));
    }

    const lenis = window.__lenis;
    if (lenis) {
      lenis.on("scroll", handleScroll);
    } else {
      window.addEventListener("scroll", handleScroll, { passive: true });
    }
    window.addEventListener("resize", handleScroll);
    handleScroll();

    function animate() {
      rafId = requestAnimationFrame(animate);
      // Wrapped rather than left to grow forever: an unbounded uTime loses
      // floating-point precision the longer a tab stays open, which shows
      // up as a sharp seam/glitch in the noise field once it's grown large
      // enough — 1000 is comfortably past the noise function's own
      // internal period, so the wrap itself is never visible.
      uniforms.uTime.value = (uniforms.uTime.value + 0.01) % 1000;
      currentProgress.current = lerp(currentProgress.current, targetProgress.current, 0.08);
      uniforms.uProgress.value = currentProgress.current;
      currentClearProgress.current = lerp(
        currentClearProgress.current,
        targetClearProgress.current,
        0.08,
      );
      uniforms.uClearProgress.value = currentClearProgress.current;
      renderer.render(scene, camera);
    }
    rafId = requestAnimationFrame(animate);

    return () => {
      destroyed = true;
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("resize", handleScroll);
      if (lenis) {
        lenis.off("scroll", handleScroll);
      } else {
        window.removeEventListener("scroll", handleScroll);
      }
      geometry.dispose();
      material.dispose();
      uniforms.uTexture.value?.dispose();
      if (videoEl) {
        videoEl.pause();
        videoEl.src = "";
      }
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [src, scrollThreshold, noiseSpeed, noiseScale, radialStrength, radialOffset, reduceMotion]);

  if (reduceMotion) {
    return (
      <div className="video-perlin-reveal">
        {isVideo ? (
          <video
            className="video-perlin-reveal-fallback-video"
            src={src}
            muted
            loop
            autoPlay
            playsInline
          />
        ) : (
          <SiteImage src={src} alt={alt} fill sizes="100vw" />
        )}
        <div className="video-perlin-reveal-overlay">{children}</div>
      </div>
    );
  }

  return (
    <div className="video-perlin-reveal">
      <div ref={containerRef} className="video-perlin-reveal-canvas-layer" />
      <div className="video-perlin-reveal-overlay">{children}</div>
    </div>
  );
}
