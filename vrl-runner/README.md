# vrl-runner

`vrl` crate를 wasm-bindgen으로 감싸 브라우저에서 VRL을 실행한다.

## 빌드

```
wasm-pack build --target web --out-dir ../src/vrl/pkg --release
```

상위 프로젝트의 `npm run build:wasm`이 동일한 명령을 실행한다.

## 라이선스

`vector-vrl-web-playground` (vectordotdev/vector, MPL-2.0)에서 차용/축약.
