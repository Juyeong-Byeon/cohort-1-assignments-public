# Ngrok을 사용한 Blockscout 외부 노출 설정

이 가이드는 blockscout API를 ngrok을 통해 외부에서 접근할 수 있도록 설정하는 방법을 설명합니다.

## 사전 준비

1. **Ngrok 계정 생성 및 Auth Token 획득**

   - https://ngrok.com/ 에서 계정 생성
   - https://dashboard.ngrok.com/get-started/your-authtoken 에서 auth token 복사

2. **Ngrok 설정 파일 수정**
   ```bash
   # ngrok/ngrok.yml 파일에서 다음 값들을 수정하세요:
   # - YOUR_NGROK_AUTH_TOKEN: 실제 auth token으로 변경
   # - your-subdomain: 원하는 서브도메인으로 변경 (예: my-blockscout)
   ```

## 실행 방법

### 1. 전체 서비스 시작

```bash
# 스크립트를 사용하여 모든 서비스를 시작
./start-with-ngrok.sh
```

### 2. 수동으로 단계별 시작

```bash
# 1. 메인 서비스 시작
docker-compose up -d

# 2. blockscout 시작
docker-compose -f blockscout-compose.yml up -d

# 3. ngrok 상태 확인
docker-compose logs ngrok
```

## 접근 URL

### 로컬 접근

- **메인 서비스**: http://localhost:8085
- **Blockscout UI**: http://localhost:80
- **Blockscout API**: http://localhost:8080

### 외부 접근 (ngrok을 통해)

- **전체 서비스**: `https://your-subdomain.ngrok.io`
- **Blockscout UI**: `https://your-subdomain.ngrok.io/explorer`
- **Blockscout API**: `https://your-subdomain.ngrok.io/api/v1/pages/main`

## API 사용 예시

```bash
# 외부에서 blockscout API 호출
curl https://your-subdomain.ngrok.io/api/v1/pages/main

# 또는 다른 API 엔드포인트
curl https://your-subdomain.ngrok.io/api/v1/blocks
curl https://your-subdomain.ngrok.io/api/v1/transactions
```

## 문제 해결

### 1. Ngrok 연결 실패

```bash
# ngrok 로그 확인
docker-compose logs ngrok

# ngrok 설정 확인
docker-compose exec ngrok cat /etc/ngrok/ngrok.yml
```

### 2. Blockscout API 접근 불가

```bash
# blockscout 서비스 상태 확인
docker-compose -f blockscout-compose.yml ps

# blockscout 로그 확인
docker-compose -f blockscout-compose.yml logs backend
```

### 3. CORS 문제

Caddy 설정에서 CORS 헤더가 이미 설정되어 있지만, 필요시 추가 설정이 가능합니다.

## 서비스 중지

```bash
# 모든 서비스 중지
docker-compose down
docker-compose -f blockscout-compose.yml down
```

