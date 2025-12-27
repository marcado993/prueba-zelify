# 🛡️ Sistema KYC (Know Your Customer)

Sistema de verificación de identidad usando AWS (S3, Textract, Rekognition).

---

## 🚀 Quick Start con Docker

### 1. Configurar Variables de Entorno

```bash
# Copiar el archivo de ejemplo
cp .env.example .env

# Editar con tus credenciales AWS
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

## 📱 Guía de Uso - Frontend

### Paso 1: Subir Documento de Identidad

1. Abre http://localhost en tu navegador
2. Ingresa un **User ID** (cualquier identificador, ej: `user-123`)
3. Selecciona tu **país** (Ecuador, Colombia, México, USA)
4. Haz clic en **"Frente del Documento"** y selecciona la foto del frente de tu cédula
5. Haz clic en **"Reverso del Documento"** y selecciona la foto del reverso (opcional)
6. Haz clic en **"Process Documents"**

> ⏳ Espera mientras AWS Textract extrae los datos de tu documento

### Paso 2: Verificar Identidad con Selfie

1. Revisa los **datos extraídos** mostrados en pantalla
2. Haz clic en **"Start Camera"** para activar tu cámara web
3. Posiciona tu rostro en el centro de la pantalla
4. Haz clic en **"Capture Photo"** para tomar la selfie
5. Si no quedó bien, haz clic en **"Retake"** para intentar de nuevo
6. Haz clic en **"Verify Identity"**

> ⏳ Espera mientras AWS Rekognition compara tu selfie con la foto del documento

### Paso 3: Ver Resultado

- ✅ **Identity Verified!** → Tu rostro coincide con el documento (similitud >= 85%)
- ❌ **Verification Failed** → Tu rostro no coincide (similitud < 85%)

---

## 🔧 Guía de Uso - Swagger API

### Acceder a Swagger

1. Abre http://localhost:3000/api en tu navegador
2. Verás la documentación interactiva de la API

### Endpoint 1: Procesar Documentos (`POST /kyc/textract`)

1. Haz clic en **POST /kyc/textract**
2. Haz clic en **"Try it out"**
3. Completa los campos:
   - **front**: Selecciona archivo de imagen (frente del documento)
   - **back**: Selecciona archivo de imagen (reverso, opcional)
   - **userId**: Escribe un ID de usuario (ej: `user-123`)
   - **country**: Escribe el código del país (`EC`, `CO`, `MX`, `US`)
4. Haz clic en **"Execute"**
5. En la respuesta verás:
   - `documentId`: Guarda este ID para el siguiente paso
   - `data.front`: Datos extraídos del frente
   - `data.back`: Datos extraídos del reverso

**Ejemplo de respuesta:**
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

### Endpoint 2: Verificar Selfie (`POST /kyc/selfieprove`)

1. Haz clic en **POST /kyc/selfieprove**
2. Haz clic en **"Try it out"**
3. Completa los campos:
   - **selfie**: Selecciona archivo de imagen (tu selfie)
   - **documentId**: Pega el `documentId` del paso anterior
4. Haz clic en **"Execute"**
5. En la respuesta verás:
   - `isMatch`: `true` si los rostros coinciden
   - `similarity`: Porcentaje de similitud (ej: 95.5)
   - `status`: `approved` o `declined`

**Ejemplo de respuesta exitosa:**
```json
{
  "isMatch": true,
  "similarity": 95.5,
  "confidence": 99.8,
  "status": "approved",
  "message": "Face verification successful. Similarity: 95.50%"
}
```

**Ejemplo de respuesta fallida:**
```json
{
  "isMatch": false,
  "similarity": 45.2,
  "confidence": 98.0,
  "status": "declined",
  "message": "Face verification failed. Similarity: 45.20% is below threshold of 85%"
}
```

---

## 🏗️ Arquitectura

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│                 │     │                  │     │                 │
│    FRONTEND     │────▶│     BACKEND      │────▶│    AWS CLOUD    │
│   (Nginx:80)    │     │   (NestJS:3000)  │     │  S3/Textract/   │
│                 │◀────│                  │◀────│   Rekognition   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

---

## 📁 Estructura del Proyecto

```
kyc-system/
├── docker-compose.yml      # Orquestación de contenedores
├── .env.example            # Template de variables de entorno
├── README.md               # Esta documentación
│
├── backend/
│   ├── Dockerfile
│   ├── src/
│   │   ├── aws/            # Servicios AWS (S3, Textract, Rekognition)
│   │   ├── kyc/            # Lógica de negocio KYC
│   │   │   ├── dto/        # Data Transfer Objects
│   │   │   ├── entities/   # Entidades de base de datos
│   │   │   ├── strategies/ # Strategy Pattern por país
│   │   │   ├── kyc.controller.ts
│   │   │   └── kyc.service.ts
│   │   └── main.ts
│   └── package.json
│
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    ├── index.html
    ├── styles.css
    └── app.js
```

---

##  Países Soportados

| Código | País | Documento |
|--------|------|-----------|
| EC | Ecuador | Cédula de Identidad |
| CO | Colombia | Cédula de Ciudadanía |
| MX | México | INE |
| US | USA | Driver License |

---

## ⚙️ Configuración AWS Requerida

### 1. Bucket S3

Crear un bucket en `us-east-1` con la siguiente política:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "textract.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::tu-bucket/*"
    }
  ]
}
```

### 2. Usuario IAM

Crear un usuario IAM con los siguientes permisos:

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

## 🧪 Desarrollo Local (sin Docker)

### Backend
```bash
cd backend
npm install
npm run start:dev
```

### Frontend
```bash
# Abrir frontend/index.html en el navegador
# O usar un servidor local:
cd frontend
npx serve .
```

---

## 🧩 Patrones de Diseño Implementados

- **Strategy Pattern**: Parsers específicos por país
- **Service Pattern**: S3Service, TextractService, RekognitionService
- **DTO Pattern**: Validación de entrada/salida
- **Module Pattern**: Segregación de responsabilidades (NestJS)

---

## 📊 Manejo de Errores

| Código HTTP | Descripción |
|-------------|-------------|
| 200/201 | Operación exitosa |
| 400 | Request inválido (archivo faltante, formato incorrecto) |
| 404 | Documento no encontrado |
| 500 | Error interno del servidor |

---

## 📚 Tecnologías

| Categoría | Tecnología |
|-----------|------------|
| Backend | NestJS, TypeScript, TypeORM |
| Frontend | HTML5, CSS3, JavaScript |
| Database | SQLite |
| Cloud | AWS S3, Textract, Rekognition |
| Container | Docker, Docker Compose |
| Server | Nginx |
| Docs | Swagger/OpenAPI |
