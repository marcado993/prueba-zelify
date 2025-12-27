# 🛡️ Sistema KYC (Know Your Customer)

Sistema de verificación de identidad usando AWS (S3, Textract, Rekognition).

---

## 🚀 Quick Start con Docker

### 1. Configurar Variables de Entorno

```bash
# Copiar el archivo de ejemplo
cp .env.example .env

# Editar con tus credenciales AWS
nano .env
```

**Variables requeridas:**
```env
AWS_ACCESS_KEY_ID=tu_access_key
AWS_SECRET_ACCESS_KEY=tu_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=nombre-de-tu-bucket
REKOGNITION_SIMILARITY_THRESHOLD=85
```

### 2. Levantar con Docker Compose

```bash
docker-compose up --build
```

### 3. Acceder a la Aplicación

- **Frontend:** http://localhost
- **Backend API:** http://localhost:3000
- **Swagger Docs:** http://localhost:3000/api

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

### Componentes

| Servicio | Puerto | Descripción |
|----------|--------|-------------|
| Frontend | 80 | Interfaz de usuario (HTML/CSS/JS + Nginx) |
| Backend | 3000 | API REST (NestJS + TypeORM + SQLite) |
| S3 | AWS | Almacenamiento de documentos y selfies |
| Textract | AWS | OCR para extracción de datos |
| Rekognition | AWS | Comparación facial biométrica |

---

## 📁 Estructura del Proyecto

```
kyc-system/
├── docker-compose.yml      # Orquestación de contenedores
├── .env.example            # Variables de entorno (template)
├── .env                    # Variables de entorno (local, no en git)
│
├── backend/
│   ├── Dockerfile          # Imagen Docker del backend
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
    ├── Dockerfile          # Imagen Docker del frontend
    ├── nginx.conf          # Configuración de Nginx
    ├── index.html
    ├── styles.css
    └── app.js
```

---

## 📡 API Endpoints

### `POST /kyc/textract`
Procesa documentos de identidad con OCR.

```bash
curl -X POST http://localhost:3000/kyc/textract \
  -F "front=@cedula_frente.jpg" \
  -F "back=@cedula_reverso.jpg" \
  -F "userId=user-123" \
  -F "country=EC"
```

### `POST /kyc/selfieprove`
Verifica identidad con comparación facial.

```bash
curl -X POST http://localhost:3000/kyc/selfieprove \
  -F "selfie=@selfie.jpg" \
  -F "documentId=uuid-del-documento"
```

---

## 🧪 Tests

### Ejecutar Tests Unitarios

```bash
cd backend
npm run test
```

### Tests del Servicio Biométrico

```bash
npm run test -- rekognition.service.spec.ts
```

**Casos de prueba incluidos:**
- ✅ Match exitoso (similitud >= 85%)
- ❌ Match fallido (similitud < 85%)
- ❌ Rostros no coinciden
- ❌ No se detectan rostros
- ⚠️ Manejo de InvalidParameterException
- 🎯 Threshold personalizado
- 💥 Re-throw de errores no manejados

---

## 🔧 Desarrollo Local (sin Docker)

### Backend

```bash
cd backend
npm install
npm run start:dev
```

### Frontend

```bash
# Simplemente abre index.html en el navegador
# O usa un servidor local:
cd frontend
npx serve .
```

---

## 🌍 Países Soportados

| Código | País | Documento |
|--------|------|-----------|
| EC | Ecuador | Cédula de Identidad |
| CO | Colombia | Cédula de Ciudadanía |
| MX | México | INE |
| US | USA | Driver License |

---

## ⚙️ Configuración AWS

### Bucket S3 Requerido

1. Crear bucket en `us-east-1`
2. Agregar política para Textract:

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

### Permisos IAM Requeridos

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::tu-bucket/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "textract:AnalyzeDocument",
        "textract:DetectDocumentText"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "rekognition:CompareFaces"
      ],
      "Resource": "*"
    }
  ]
}
```

---

## 🔐 Seguridad

- Las credenciales AWS se pasan via variables de entorno
- Los archivos `.env` están en `.gitignore`
- Las imágenes se almacenan en S3 privado
- El threshold de similitud es configurable (default: 85%)

---

## 📊 Manejo de Errores

| Código | Descripción |
|--------|-------------|
| 400 | Request inválido (archivo faltante, formato incorrecto) |
| 404 | Documento no encontrado |
| 500 | Error interno (AWS service unavailable) |

Los logs incluyen:
- Líneas extraídas por Textract
- Errores de AWS con detalles
- Resultados de comparación facial

---

## 🧩 Patrones de Diseño

- **Strategy Pattern**: Parsers específicos por país
- **Repository Pattern**: Acceso a datos con TypeORM
- **DTO Pattern**: Validación de entrada/salida
- **Module Pattern**: Segregación de responsabilidades (NestJS)

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

---

## 👨‍💻 Autor

Sistema KYC desarrollado como challenge técnico.
