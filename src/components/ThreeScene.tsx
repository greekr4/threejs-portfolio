"use client";

import React, { useRef, useEffect, useState, useMemo, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  PerspectiveCamera,
  Text,
  Html,
  Stats,
  useGLTF,
  Environment,
} from "@react-three/drei";
import * as THREE from "three";

// 프로젝트 타입 정의
interface Project {
  id: number;
  title: string;
  description: string;
  position: [number, number, number];
  color: string;
  image?: string; // 화면에 표시할 이미지 경로
}

// Player 모델 타입 정의
interface PlayerModelProps {
  position: [number, number, number];
  rotation: [number, number, number];
}

// 프로젝트 데이터
const projects: Project[] = [
  {
    id: 1,
    title: "프로젝트1",
    description: "프로젝트1 설명",
    position: [-10, 4, 0],
    color: "#4568dc",
    image: "images/1.png", // 경로 수정
  },
  {
    id: 2,
    title: "프로젝트2",
    description: "프로젝트2 설명",
    position: [10, 4, 0],
    color: "#b06ab3",
    image: "images/2.png", // 경로 수정
  },
  {
    id: 3,
    title: "프로젝트3",
    description: "프로젝트3 설명",
    position: [0, 4, -15],
    color: "#00bcd4",
    image: "images/3.png", // 경로 수정
  },
];

// Player 모델 컴포넌트
function PlayerModel({ position, rotation }: PlayerModelProps) {
  const { scene } = useGLTF("/gltf/ufo/scene.gltf");
  const PlayerRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (PlayerRef.current) {
      PlayerRef.current.position.set(position[0], position[1], position[2]);
      PlayerRef.current.rotation.set(rotation[0], rotation[1], rotation[2]);
    }
  }, [position, rotation]);

  // 자동 회전 애니메이션 (이동 중이 아닐 때만)
  useFrame((state, delta) => {
    if (
      PlayerRef.current &&
      Math.abs(position[0]) < 0.1 &&
      Math.abs(position[2] - 10) < 0.1
    ) {
      // 정지 상태일 때만 자동 회전
      PlayerRef.current.rotation.y += delta * 0.2; // 천천히 회전

      // 약간 위아래로 떠오르는 애니메이션
      const hoverOffset = Math.sin(state.clock.elapsedTime * 0.5) * 0.2;
      PlayerRef.current.position.y = position[1] + hoverOffset;
    }
  });

  return (
    <primitive
      ref={PlayerRef}
      object={scene}
      scale={[30, 30, 30]} // Player 크기 증가
      rotation={[0, Math.PI, 0]} // 180도 회전하여 앞을 바라보도록 설정
      position={[0, 0, 0]}
    />
  );
}

function PhoneModel({
  position,
  rotation,
  projectColor,
  projectImage,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  projectColor: string;
  projectImage?: string;
}) {
  const phoneRef = useRef<THREE.Group>(null);
  const screenRef = useRef<THREE.Mesh>(null);
  const originalPos = useRef<THREE.Vector3 | null>(null);
  const { scene } = useGLTF("/gltf/iphone17/scene.gltf");
  const clonedScene = useMemo(() => scene.clone(), [scene]);

  // 텍스처 상태 관리
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [useColorOnly, setUseColorOnly] = useState(false);

  // 텍스처 설정 상태 관리
  const [textureSettings, setTextureSettings] = useState({
    repeatX: 1.0,
    repeatY: 1.0,
    offsetX: 0.0,
    offsetY: 0.0,
    uvScaleX: 0.8,
    uvScaleY: 0.8,
    uvOffsetX: 0.1,
    uvOffsetY: 0.1,
    planeScaleX: 0.1, // 가로 크기 줄임
    planeScaleY: 0.25, // 세로 크기 줄임
    planeRotationZ: 0, // 회전 초기화
    planeOffsetZ: 0.001,
    planeOffsetY: 0.05, // Y축 위치 조정
  });

  // 디버깅 UI 표시 상태
  const [showDebugUI, setShowDebugUI] = useState(false);

  // 텍스처 생성 (색상 기반)
  const colorTexture = useMemo(() => {
    // 더 높은 해상도의 캔버스 생성
    const canvas = document.createElement("canvas");
    canvas.width = 512; // 해상도 증가
    canvas.height = 1024; // 해상도 증가
    const context = canvas.getContext("2d");

    if (context) {
      // 고품질 렌더링 설정
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";

      // 배경색 채우기
      context.fillStyle = projectColor;
      context.fillRect(0, 0, canvas.width, canvas.height);

      // 텍스트 추가 (해상도에 맞게 크기 조정)
      context.fillStyle = "white";
      context.font = "bold 48px Arial"; // 폰트 크기 증가
      context.textAlign = "center";
      context.fillText("프로젝트", canvas.width / 2, canvas.height / 2 - 40);
      context.fillText("화면", canvas.width / 2, canvas.height / 2 + 40);

      // 텍스처 생성
      const newTexture = new THREE.CanvasTexture(canvas);

      // 선명도를 위한 텍스처 설정
      newTexture.generateMipmaps = false;
      newTexture.minFilter = THREE.LinearFilter;
      newTexture.magFilter = THREE.LinearFilter;
      newTexture.wrapS = THREE.ClampToEdgeWrapping;
      newTexture.wrapT = THREE.ClampToEdgeWrapping;

      return newTexture;
    }

    return null;
  }, [projectColor]);

  // 이미지 텍스처 로드
  useEffect(() => {
    if (!projectImage) {
      // 이미지가 없으면 색상 텍스처 사용
      setTexture(colorTexture);
      setUseColorOnly(true);
      return;
    }

    console.log("이미지 로드 시도:", projectImage);

    const textureLoader = new THREE.TextureLoader();
    textureLoader.crossOrigin = "anonymous";

    textureLoader.load(
      projectImage,
      (loadedTexture) => {
        console.log("텍스처 로드 성공:", projectImage);

        // 선명도를 위한 텍스처 설정 개선
        loadedTexture.generateMipmaps = false; // 밉맵 비활성화로 선명도 향상
        loadedTexture.wrapS = THREE.ClampToEdgeWrapping;
        loadedTexture.wrapT = THREE.ClampToEdgeWrapping;
        loadedTexture.minFilter = THREE.LinearFilter; // 선형 필터 사용
        loadedTexture.magFilter = THREE.LinearFilter; // 확대 시에도 선형 필터

        // 텍스처 비율 유지
        loadedTexture.repeat.set(1, 1);
        loadedTexture.offset.set(0, 0);
        loadedTexture.flipY = true; // 이미지 상하 반전 (Three.js 기본값)

        // 텍스처 업데이트
        loadedTexture.needsUpdate = true;

        setTexture(loadedTexture);
        setUseColorOnly(false);

        console.log("텍스처 설정 완료:", loadedTexture);
      },
      undefined,
      (error) => {
        console.error("텍스처 로드 실패:", projectImage, error);
        // 실패 시 색상 텍스처 사용
        setTexture(colorTexture);
        setUseColorOnly(true);
      }
    );

    return () => {
      if (texture && texture !== colorTexture) {
        texture.dispose();
      }
    };
  }, [projectImage, colorTexture]);

  // 디버깅: 모델 구조 분석 및 텍스처 적용
  useEffect(() => {
    // 텍스처가 로드된 후에만 실행
    if (!texture) return;

    console.log("===== 모델 구조 디버깅 시작 =====");
    console.log("전체 씬:", clonedScene);

    // 모델 구조 탐색
    let meshCount = 0;
    let materialCount = 0;

    clonedScene.traverse((object) => {
      console.log("object", object);
      console.log(`객체: ${object.name}, 타입: ${object.type}`);

      if (object instanceof THREE.Mesh) {
        meshCount++;
        console.log(`메시 ${meshCount}: ${object.name}`);

        // 메시의 재질 확인
        if (object.material) {
          materialCount++;
          if (Array.isArray(object.material)) {
            console.log(`  - 재질 배열 (${object.material.length}개):`);
            object.material.forEach((mat, idx) => {
              console.log(`    ${idx}: ${mat.type}, ${mat.name}`);

              // Display 재질을 찾아 텍스처 교체
              if (mat.name === "Display") {
                console.log(`재질 ${idx}가 Display, 텍스처 교체`);

                // 둥근 모서리를 위한 셰이더 머티리얼로 교체
                const vertexShader = `
                  varying vec2 vUv;
                  void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                  }
                `;

                const fragmentShader = `
                  uniform sampler2D map;
                  uniform float borderRadius;
                  varying vec2 vUv;

                  float roundedBoxSDF(vec2 CenterPosition, vec2 Size, float Radius) {
                    return length(max(abs(CenterPosition) - Size + Radius, 0.0)) - Radius;
                  }

                  void main() {
                    vec2 center = vUv - 0.5;
                    float dist = roundedBoxSDF(center, vec2(0.4, 0.48), borderRadius);
                    
                    if (dist > 0.0) {
                      discard;
                    }
                    
                    vec4 texColor = texture2D(map, vUv);
                    gl_FragColor = texColor;
                  }
                `;

                // 이미지 선명도를 위한 텍스처 설정
                if (texture) {
                  texture.generateMipmaps = false;
                  texture.minFilter = THREE.LinearFilter;
                  texture.magFilter = THREE.LinearFilter;
                  texture.wrapS = THREE.ClampToEdgeWrapping;
                  texture.wrapT = THREE.ClampToEdgeWrapping;
                  texture.needsUpdate = true;
                }

                // 새로운 셰이더 머티리얼로 교체
                const newMaterial = new THREE.ShaderMaterial({
                  uniforms: {
                    map: { value: texture },
                    borderRadius: { value: 0.08 },
                  },
                  vertexShader: vertexShader,
                  fragmentShader: fragmentShader,
                  transparent: true,
                  side: THREE.DoubleSide,
                  depthTest: true,
                  depthWrite: true,
                });

                // 배열에서 해당 재질 교체
                object.material[idx] = newMaterial;

                console.log(`재질 ${idx}의 셰이더 재질 교체 완료`);
              }
            });
          } else {
            console.log(
              `  - 재질: ${object.material.type}, ${object.material.name}`
            );

            // Display 재질 찾아서 텍스처 교체
            if (object.material.name === "Display") {
              console.log("Display 재질 발견, 텍스처 교체");

              // 기존 메시의 정보 저장
              const originalGeometry = object.geometry;
              const originalPosition = object.position.clone();
              const originalRotation = object.rotation.clone();
              const originalScale = object.scale.clone();
              const originalParent = object.parent;

              // 원본 위치 저장 (나중에 참조할 수 있도록)
              originalPos.current = originalPosition;

              // 기존 메시 숨기기 (제거하지 않고 투명하게)
              object.visible = false;

              // 둥근 모서리를 위한 셰이더 머티리얼 생성
              const vertexShader = `
                varying vec2 vUv;
                void main() {
                  vUv = uv;
                  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
              `;

              const fragmentShader = `
                uniform sampler2D map;
                uniform float borderRadius;
                varying vec2 vUv;

                float roundedBoxSDF(vec2 CenterPosition, vec2 Size, float Radius) {
                  return length(max(abs(CenterPosition) - Size + Radius, 0.0)) - Radius;
                }

                void main() {
                  vec2 center = vUv - 0.5;
                  float dist = roundedBoxSDF(center, vec2(0.4, 0.48), borderRadius);
                  
                  if (dist > 0.0) {
                    discard;
                  }
                  
                  vec4 texColor = texture2D(map, vUv);
                  gl_FragColor = texColor;
                }
              `;

              // 새로운 평면 메시 생성 (크기 조정)
              const planeGeometry = new THREE.PlaneGeometry(0.12, 0.2);
              const planeMaterial = new THREE.ShaderMaterial({
                uniforms: {
                  map: { value: texture },
                  borderRadius: { value: 0.08 }, // 둥근 모서리 반지름
                },
                vertexShader: vertexShader,
                fragmentShader: fragmentShader,
                transparent: true,
                side: THREE.DoubleSide,
                depthTest: true,
                depthWrite: true,
              });

              const displayPlane = new THREE.Mesh(planeGeometry, planeMaterial);

              // 평면 위치 조정 (Display 위치에 맞게)
              displayPlane.position.copy(originalPosition);
              displayPlane.rotation.copy(originalRotation);

              // 모델에 따라 회전 및 위치 조정이 필요할 수 있음
              displayPlane.rotation.z = 0; // 회전 초기화
              displayPlane.position.z += 0.0032; // 앞으로 이동 (값 증가)
              displayPlane.position.y += 0; // 약간 위로 이동
              displayPlane.position.x += 0.0; // 좌우 조정

              // 스케일 조정 (모델에 맞게)
              displayPlane.scale.set(0.78, 0.8, 1); // 원본 스케일 사용

              // 이미지 선명도를 위한 텍스처 설정 개선
              if (texture) {
                texture.flipY = true; // 이미지 상하 반전
                texture.generateMipmaps = false; // 밉맵 비활성화로 선명도 향상
                texture.minFilter = THREE.LinearFilter; // 선형 필터로 부드러움
                texture.magFilter = THREE.LinearFilter; // 확대 시에도 선형 필터
                texture.wrapS = THREE.ClampToEdgeWrapping;
                texture.wrapT = THREE.ClampToEdgeWrapping;
                texture.needsUpdate = true;
              }

              // 씬에 추가
              if (originalParent) {
                originalParent.add(displayPlane);
              }

              // 디스플레이 평면 참조 저장 (나중에 접근할 수 있도록)
              if (screenRef.current === null) {
                screenRef.current = displayPlane;
              }

              console.log("평면 디스플레이 추가 완료");
            }
          }
        }
      }
    });

    console.log(`총 메시 수: ${meshCount}, 총 재질 수: ${materialCount}`);
    console.log("===== 모델 구조 디버깅 완료 =====");
  }, [clonedScene, texture]);

  // 초기 위치 설정
  useEffect(() => {
    if (phoneRef.current) {
      phoneRef.current.position.set(position[0], position[1], position[2]);
      phoneRef.current.rotation.set(rotation[0], rotation[1], rotation[2]);
    }
  }, [position, rotation]);

  // 자동 회전 애니메이션
  useFrame((state, delta) => {
    if (phoneRef.current) {
      // Y축을 중심으로 천천히 회전
      phoneRef.current.rotation.y += delta * 0.5;

      // 약간 위아래로 떠오르는 애니메이션
      const hoverOffset = Math.sin(state.clock.elapsedTime) * 1;
      phoneRef.current.position.y = position[1] + hoverOffset;

      // 화면 메시가 핸드폰과 함께 움직이도록 업데이트
      if (screenRef.current) {
        // 핸드폰 위치와 회전 가져오기
        const phonePosition = new THREE.Vector3();
        phoneRef.current.getWorldPosition(phonePosition);

        // 핸드폰 회전 가져오기
        const phoneQuaternion = phoneRef.current.quaternion.clone();

        // 화면 메시 위치 및 회전 설정
        screenRef.current.position.copy(phonePosition);
        screenRef.current.quaternion.copy(phoneQuaternion);

        // 핸드폰 앞쪽 방향 계산
        const forward = new THREE.Vector3(0, 0, 1);
        forward.applyQuaternion(phoneQuaternion);

        // 화면을 핸드폰 앞쪽에 배치
        screenRef.current.position.add(forward.multiplyScalar(0.1));
      }
    }
  });

  // 텍스처 설정 적용
  useEffect(() => {
    if (texture) {
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;

      texture.repeat.set(textureSettings.repeatX, textureSettings.repeatY);
      texture.offset.set(textureSettings.offsetX, textureSettings.offsetY);
      texture.needsUpdate = true;
    }
  }, [texture, textureSettings]);

  return (
    <>
      <primitive ref={phoneRef} object={clonedScene} scale={[40, 40, 40]} />
    </>
  );
}

function IMacModel({
  position,
  rotation,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
}) {
  const phoneRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF("/gltf/imac/scene.gltf");
  const clonedScene = useMemo(() => scene.clone(), [scene]);

  // 초기 위치 설정
  useEffect(() => {
    if (phoneRef.current) {
      phoneRef.current.position.set(position[0], position[1], position[2]);
      phoneRef.current.rotation.set(rotation[0], rotation[1], rotation[2]);
    }
  }, [position, rotation]);

  // 자동 회전 애니메이션
  useFrame((state, delta) => {
    if (phoneRef.current) {
      // Y축을 중심으로 천천히 회전
      phoneRef.current.rotation.y += delta * 0.5;

      // 약간 위아래로 떠오르는 애니메이션
      const hoverOffset = Math.sin(state.clock.elapsedTime) * 1;
      phoneRef.current.position.y = position[1] + hoverOffset;
    }
  });

  return <primitive ref={phoneRef} object={clonedScene} scale={[10, 10, 10]} />;
}

// 표지판 컴포넌트
function ProjectSign({ project }: { project: Project }) {
  const signRef = useRef<THREE.Group>(null);

  return (
    <>
      <PhoneModel
        position={project.position}
        rotation={[0, 0, 0]}
        projectColor={project.color}
        projectImage={project.image}
      />
      <Html
        position={[
          project.position[0],
          project.position[1] - 2,
          project.position[2],
        ]}
        center
      >
        <div
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            color: project.color,
            padding: "10px",
            borderRadius: "5px",
            width: "200px",
            textAlign: "center",
          }}
        >
          <h3 style={{ margin: "0 0 5px 0" }}>{project.title}</h3>
          <p style={{ margin: "0", fontSize: "12px" }}>{project.description}</p>
        </div>
      </Html>
    </>
  );
}

// 바닥 컴포넌트
function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]} receiveShadow>
      <planeGeometry args={[100, 100]} />
      <meshStandardMaterial color="#303030" />
    </mesh>
  );
}

// 방향키 가이드 컴포넌트
function KeyboardGuide() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
    }, 0); // 10초 후 가이드 숨기기

    const handleKeyDown = () => {
      setVisible(false); // 아무 키나 누르면 가이드 숨기기
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  if (!visible) return null;

  return (
    <Html center position={[0, 0, -2]} style={{ pointerEvents: "none" }}>
      <div
        style={{
          backgroundColor: "rgba(0, 0, 0, 0.7)",
          color: "white",
          padding: "20px",
          borderRadius: "10px",
          textAlign: "center",
          fontFamily: "Arial, sans-serif",
          width: "300px",
        }}
      >
        <h3 style={{ margin: "0 0 15px 0" }}>Player 조종하기</h3>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: "15px",
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              border: "2px solid white",
              borderRadius: "5px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "bold",
            }}
          >
            ↑
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              border: "2px solid white",
              borderRadius: "5px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "bold",
            }}
          >
            ←
          </div>
          <div
            style={{
              width: "40px",
              height: "40px",
              border: "2px solid white",
              borderRadius: "5px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "bold",
            }}
          >
            ↓
          </div>
          <div
            style={{
              width: "40px",
              height: "40px",
              border: "2px solid white",
              borderRadius: "5px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "bold",
            }}
          >
            →
          </div>
        </div>
        <p style={{ margin: "15px 0 0 0", fontSize: "14px" }}>
          방향키로 Player를 조종하여 프로젝트를 탐색하세요
        </p>
      </div>
    </Html>
  );
}

// 배경 입자 효과 - 최적화 버전
function Particles() {
  const particlesRef = useRef<THREE.Points>(null);

  // 파티클 수 감소
  const count = 300;

  // 파티클 위치 계산 - useMemo로 최적화
  const positions = useMemo(() => {
    const posArray = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      posArray[i3] = (Math.random() - 0.5) * 50;
      posArray[i3 + 1] = (Math.random() - 0.5) * 50;
      posArray[i3 + 2] = (Math.random() - 0.5) * 50;
    }
    return posArray;
  }, [count]);

  // 파티클 회전 속도 감소
  useFrame(() => {
    if (particlesRef.current) {
      particlesRef.current.rotation.y += 0.0001;
    }
  });

  // 파티클 지오메트리와 머티리얼 최적화
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [positions]);

  const material = useMemo(() => {
    return new THREE.PointsMaterial({
      size: 0.05,
      color: "#ffffff",
      transparent: true,
      opacity: 0.3,
      sizeAttenuation: true,
    });
  }, []);

  return <points ref={particlesRef} geometry={geometry} material={material} />;
}

// Player 컨트롤러 컴포넌트
function PlayerController() {
  // Player 위치 및 회전 상태
  const [position, setPosition] = useState<[number, number, number]>([
    0, 3, 10,
  ]); // 높이 증가
  const [rotation, setRotation] = useState<[number, number, number]>([
    0,
    Math.PI,
    0,
  ]); // 초기 회전값 설정
  const [velocity, setVelocity] = useState<[number, number, number]>([0, 0, 0]);
  const [keys, setKeys] = useState({
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
  });

  // 키보드 이벤트 처리
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key in keys) {
        setKeys((prev) => ({ ...prev, [e.key]: true }));
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key in keys) {
        setKeys((prev) => ({ ...prev, [e.key]: false }));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Player 움직임 처리
  useFrame((state, delta) => {
    // 속도 계산
    const newVelocity: [number, number, number] = [...velocity];
    const speed = 0.5 * delta; // 속도 감소
    const drag = 0.98; // 항력 감소로 더 부드럽게 이동

    // 방향키에 따른 속도 변경 - 방향 수정
    if (keys.ArrowUp) newVelocity[2] -= speed;
    if (keys.ArrowDown) newVelocity[2] += speed;
    if (keys.ArrowLeft) newVelocity[0] -= speed;
    if (keys.ArrowRight) newVelocity[0] += speed;

    // 항력 적용 (속도 감소)
    newVelocity[0] *= drag;
    newVelocity[1] *= drag;
    newVelocity[2] *= drag;

    // 새 위치 계산
    const newPosition: [number, number, number] = [
      position[0] + newVelocity[0],
      position[1] + newVelocity[1],
      position[2] + newVelocity[2],
    ];

    // 경계 제한
    const bound = 45;
    if (Math.abs(newPosition[0]) > bound)
      newPosition[0] = Math.sign(newPosition[0]) * bound;
    if (Math.abs(newPosition[2]) > bound)
      newPosition[2] = Math.sign(newPosition[2]) * bound;

    // 회전 계산 (방향에 따라 기울이기)
    const targetRotationX = newVelocity[2] * 0.3; // 회전 감소
    const targetRotationZ = -newVelocity[0] * 0.3; // 회전 감소
    const rotationSpeed = 3 * delta; // 회전 속도 감소

    const newRotation: [number, number, number] = [
      rotation[0] + (targetRotationX - rotation[0]) * rotationSpeed,
      Math.PI +
        (keys.ArrowLeft ? 0.03 : keys.ArrowRight ? -0.03 : 0) *
          rotationSpeed *
          10, // 회전 기준값 수정
      rotation[2] + (targetRotationZ - rotation[2]) * rotationSpeed,
    ];

    // 상태 업데이트
    setPosition(newPosition);
    setRotation(newRotation);
    setVelocity(newVelocity);

    // 카메라 위치 업데이트 (Player 뒤따라가기 - 사선 각도에서 내려다보기)
    const cameraOffset = {
      x: 0, // 좌우 오프셋 (0은 중앙)
      y: 7, // 높이 증가
      z: 5, // 뒤쪽 거리 증가
      angleX: -0.5, // X축 회전 (음수값: 아래로 내려다보기)
    };

    // 카메라 위치 계산
    state.camera.position.set(
      newPosition[0] + cameraOffset.x,
      newPosition[1] + cameraOffset.y,
      newPosition[2] + cameraOffset.z
    );

    // 카메라 각도 조정 (사선으로 내려다보기)
    state.camera.lookAt(
      newPosition[0],
      newPosition[1] - 2, // 약간 아래쪽을 바라보도록 조정
      newPosition[2]
    );

    // 카메라 기울기 추가
    state.camera.rotation.x = cameraOffset.angleX;
  });

  return <PlayerModel position={position} rotation={rotation} />;
}

// WebGL 컨텍스트 손실 처리
function WebGLErrorHandler() {
  useEffect(() => {
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      console.warn("WebGL 컨텍스트가 손실되었습니다. 페이지를 새로고침하세요.");
    };

    const handleContextRestored = () => {
      console.log("WebGL 컨텍스트가 복구되었습니다.");
    };

    const canvas = document.querySelector("canvas");
    if (canvas) {
      canvas.addEventListener("webglcontextlost", handleContextLost);
      canvas.addEventListener("webglcontextrestored", handleContextRestored);
    }

    return () => {
      if (canvas) {
        canvas.removeEventListener("webglcontextlost", handleContextLost);
        canvas.removeEventListener(
          "webglcontextrestored",
          handleContextRestored
        );
      }
    };
  }, []);

  return null;
}

// 씬 컴포넌트
function Scene() {
  return (
    <>
      <WebGLErrorHandler />
      {/* <fog attach="fog" args={["#1e1e2f", 20, 70]} /> */}
      <KeyboardGuide />

      <ambientLight intensity={0.3} />
      <directionalLight position={[0, 0, 0]} intensity={0.8} castShadow />

      <Suspense fallback={null}>
        <PlayerController />
        <Particles />
        <Floor />
        <Environment preset="sunset" />

        {/* 프로젝트 표지판 */}
        {projects.map((project) => (
          <ProjectSign key={project.id} project={project} />
        ))}
        <IMacModel position={[0, 3, 15]} rotation={[0, 0, 0]} />
      </Suspense>
    </>
  );
}

export default function ThreeScene() {
  // 키보드 포커스를 위한 캔버스 클릭 핸들러
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 컴포넌트 마운트 시 자동으로 포커스
    if (canvasRef.current) {
      canvasRef.current.focus();
    }

    // 문서 클릭 시 캔버스에 포커스
    const handleDocumentClick = () => {
      if (canvasRef.current) {
        canvasRef.current.focus();
      }
    };

    document.addEventListener("click", handleDocumentClick);

    return () => {
      document.removeEventListener("click", handleDocumentClick);
    };
  }, []);

  return (
    <ErrorBoundary>
      <div
        ref={canvasRef}
        style={{ width: "100%", height: "100%", outline: "none" }}
        tabIndex={0} // 키보드 포커스를 받을 수 있도록 설정
      >
        <Canvas
          style={{ background: "linear-gradient(to bottom, #1e1e2f, #2d2d44)" }}
          shadows
          gl={{
            antialias: false,
            powerPreference: "high-performance",
            alpha: false,
            stencil: false,
            depth: true,
            precision: "lowp",
          }}
          dpr={[0.7, 1]}
          frameloop="always"
        >
          <Scene />
        </Canvas>
      </div>
    </ErrorBoundary>
  );
}

// 에러 경계 컴포넌트
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("WebGL 렌더링 오류:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            width: "100%",
            height: "100vh",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "#1e1e2f",
            color: "white",
            flexDirection: "column",
            padding: "20px",
            textAlign: "center",
          }}
        >
          <h2>WebGL 렌더링 오류</h2>
          <p>
            브라우저가 WebGL을 지원하지 않거나 그래픽 드라이버에 문제가
            있습니다.
          </p>
          <p>최신 브라우저로 업데이트하거나 그래픽 드라이버를 확인해주세요.</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: "20px",
              padding: "10px 20px",
              backgroundColor: "#4568dc",
              border: "none",
              borderRadius: "5px",
              color: "white",
              cursor: "pointer",
            }}
          >
            새로고침
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
