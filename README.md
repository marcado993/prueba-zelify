# 🛡️ Sistema KYC (Know Your Customer)

Sistema de verificación de identidad usando AWS (S3, Textract, Rekognition) desarrollado con NestJS y TypeScript.

---

## 🚀 Quick Start con Docker

### 1. Configurar Variables de Entorno

```bash
cp .env.example .env
```

**Variables requeridas en `.env`:**
```env
AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXXXXX
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AWS_REGION=us-east-1
AWS_S3_BUCKET=nombre-de-tu-bucket-s3
REKOGNITION_SIMILARITY_THRESHOLD=85
```

### 2. Levantar con Docker Compose

```bash
docker-compose up --build
```

### 3. Acceder a la Aplicación

| Servicio | URL |
|----------|-----|
| **Frontend** | http://localhost |
| **Backend API** | http://localhost:3000 |
| **Swagger Docs** | http://localhost:3000/api |

---

## 🏗️ Arquitectura del Sistema

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│                 │     │                  │     │                 │
│    FRONTEND     │────▶│     BACKEND      │────▶│    AWS CLOUD    │
│   (Nginx:80)    │     │   (NestJS:3000)  │     │  S3/Textract/   │
│                 │◀────│                  │◀────│   Rekognition   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

### Flujo de Verificación KYC

```
1. Usuario sube documento de identidad
         ↓
2. Backend guarda imagen en AWS S3
         ↓
3. AWS Textract extrae texto del documento (OCR)
         ↓
4. Strategy Pattern parsea datos según el país
         ↓
5. Usuario toma selfie con cámara web
         ↓
6. AWS Rekognition compara rostros
         ↓
7. Sistema aprueba/rechaza verificación (threshold: 85%)
```

---

## 📁 Estructura del Proyecto

```
kyc-system/
├── docker-compose.yml
├── .env.example
│
├── backend/                          # NestJS API
│   ├── Dockerfile
│   ├── src/
│   │   ├── main.ts                   # Punto de entrada
│   │   ├── app.module.ts             # Módulo principal
│   │   │
│   │   ├── aws/                      # 🌩️ Servicios AWS
│   │   │   ├── s3.service.ts         # Upload/download S3
│   │   │   ├── textract.service.ts   # OCR de documentos
│   │   │   └── rekognition.service.ts# Comparación facial
│   │   │
│   │   └── kyc/                      # 📋 Lógica de negocio
│   │       ├── kyc.controller.ts     # Endpoints REST
│   │       ├── kyc.service.ts        # Orquestador principal
│   │       ├── dto/                  # Data Transfer Objects
│   │       ├── entities/             # Entidad SQLite
│   │       └── strategies/           # Parsers por país
│   │           ├── ecuador-identity.strategy.ts
│   │           ├── colombia-identity.strategy.ts
│   │           ├── mexico-identity.strategy.ts
│   │           └── usa-identity.strategy.ts
│   │
│   └── package.json
│
└── frontend/                         # UI estática
    ├── Dockerfile
    ├── nginx.conf
    ├── index.html
    ├── styles.css
    └── app.js
```

---

## 🔧 Backend - Componentes Principales

### S3Service - Almacenamiento
```typescript
uploadFile(file, folder) → { key: "documents/front-uuid.jpg" }
getBucketName() → "kyc-demo-bucket"
```

### TextractService - OCR
```typescript
analyzeDocumentFromS3(bucket, key) → Block[]
// Devuelve líneas de texto extraídas del documento
```

### RekognitionService - Biometría
```typescript
compareFaces(documentS3Key, selfieS3Key) → {
  isMatch: boolean,
  similarity: number,  // 0-100%
  message: string
}
```

### KycService - Orquestador
```typescript
processDocuments(front, back, userId, country) → ExtractDocumentResponseDto
verifySelfie(selfie, documentId) → SelfieVerificationDto
```

### Strategy Pattern - Parsers por País
```
EC → EcuadorIdentityStrategy  (Cédula de Identidad)
CO → ColombiaIdentityStrategy (Cédula de Ciudadanía)
MX → MexicoIdentityStrategy   (INE)
US → USAIdentityStrategy      (Driver License)
```

---

## 📡 API Endpoints

### `POST /kyc/textract` - Procesar Documentos

**Request (multipart/form-data):**
- `front`: imagen del frente del documento (requerido)
- `back`: imagen del reverso (opcional)
- `userId`: string
- `country`: `EC` | `CO` | `MX` | `US`

**Response:**
```json
{
  "success": true,
  "data": {
    "front": {
      "id_number": "0450176870",
      "surnames": "GUERRERO HINOJOSA",
      "names": "LUIS ANDRES",
      "nationality": "ECUATORIANA",
      "birth_date": "15 NOV 2002",
      "sex": "HOMBRE"
    },
    "back": {
      "father_name": "GUERRERO SANCHEZ LUIS EDUARDO",
      "mother_name": "HINOJOSA OBANDO NIMIA YOLANDA",
      "civil_status": "SOLTERO"
    }
  },
  "documentId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "message": "Documentos procesados exitosamente"
}
```

### `POST /kyc/selfieprove` - Verificar Identidad

**Request (multipart/form-data):**
- `selfie`: imagen de selfie
- `documentId`: UUID del documento procesado

**Response (aprobado):**
```json
{
  "isMatch": true,
  "similarity": 95.5,
  "status": "approved",
  "message": "Face verification successful. Similarity: 95.50%"
}
```

**Response (rechazado):**
```json
{
  "isMatch": false,
  "similarity": 45.2,
  "status": "declined",
  "message": "Face verification failed. Similarity: 45.20% is below threshold of 85%"
}
```

---

## 📱 Guía de Uso - Frontend

1. **Ingresar User ID** y seleccionar país
2. **Subir documento** (frente y reverso)
3. **Click "Process Documents"** → Ver datos extraídos
4. **Activar cámara** y capturar selfie
5. **Click "Verify Identity"** → Ver resultado

---

## 🔧 Guía de Uso - Swagger

1. Abrir http://localhost:3000/api
2. **POST /kyc/textract**: Subir documento y copiar `documentId`
3. **POST /kyc/selfieprove**: Subir selfie con el `documentId`

---

## ⚙️ Configuración AWS

### Bucket S3
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Service": "textract.amazonaws.com" },
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::tu-bucket/*"
  }]
}
```

### Usuario IAM
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::tu-bucket/*"
    },
    {
      "Effect": "Allow",
      "Action": ["textract:AnalyzeDocument", "textract:DetectDocumentText"],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": ["rekognition:CompareFaces"],
      "Resource": "*"
    }
  ]
}
```

---

## 🧩 Patrones de Diseño

| Patrón | Uso |
|--------|-----|
| **Strategy** | Parsers específicos por país |
| **Service** | S3Service, TextractService, RekognitionService |
| **DTO** | Validación de entrada/salida |
| **Module** | Segregación de responsabilidades (NestJS) |
| **Repository** | TypeORM para acceso a datos |

---

## 📊 Manejo de Errores

| HTTP | Descripción |
|------|-------------|
| 200/201 | Operación exitosa |
| 400 | Request inválido |
| 404 | Documento no encontrado |
| 500 | Error interno |

---

## 🧪 Desarrollo Local

```bash
# Backend
cd backend && npm install && npm run start:dev

# Frontend
# Abrir frontend/index.html en navegador
```

---

## 📚 Tecnologías

| Categoría | Stack |
|-----------|-------|
| Backend | NestJS, TypeScript, TypeORM, SQLite |
| Frontend | HTML5, CSS3, JavaScript, Nginx |
| Cloud | AWS S3, Textract, Rekognition |
| DevOps | Docker, Docker Compose |
| Docs | Swagger/OpenAPI |
