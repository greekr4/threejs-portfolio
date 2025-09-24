"use client";

import dynamic from "next/dynamic";
import styles from "./page.module.css";

// Three.js 컴포넌트를 클라이언트 사이드에서만 렌더링하기 위해 dynamic import 사용
const ThreeScene = dynamic(
  () =>
    import("../components/ThreeScene").catch(() => {
      // 모듈을 찾을 수 없을 경우 대체 컴포넌트 반환
      const ErrorComponent = () => (
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
        </div>
      );
      return { default: ErrorComponent };
    }),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          width: "100%",
          height: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#1e1e2f",
          color: "white",
        }}
      >
        로딩 중...
      </div>
    ),
  }
);

export default function Home() {
  return (
    <div className={styles.fullscreenContainer}>
      <ThreeScene />
    </div>
  );
}
