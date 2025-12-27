import { ApiProperty } from '@nestjs/swagger';

export class ExtractDocumentResponseDto {
    @ApiProperty({ example: true })
    success: boolean;

    @ApiProperty({
        example: {
            front: {
                id_number: '1757093081',
                surnames: 'LEMA YAUCAN',
                names: 'DIEGO ARMANDO',
                nationality: 'ECUATORIANA',
                birth_date: '2005-06-22',
                birth_place: 'PICHINCHA QUITO LA MAGDALENA',
                sex: 'HOMBRE',
                civil_status: 'SOLTERO',
                spouse: null,
                expiration_date: '2034-01-16',
            },
            back: {
                father_name: 'LEMA CAIZA LUIS PATRICIO',
                mother_name: 'YAUCAN CAIN DELIA MONICA',
                civil_status: 'SOLTERO',
                profession: null,
                education: null,
                issue_date: '2024-01-16',
                issue_place: 'QUITO',
                expiration_date: '2034-01-16',
                fingerprint_code: 'A1131A1121',
                blood_type: 'O+',
                donor_status: 'No donante',
                mrz: 'I<ECU0741032423<<<<<17570930810506225M3401169ECU<NO<DONANTE6LEMA<YAUCAN<<DIEGO<ARMANDO<<<<',
            },
        },
    })
    data: {
        front?: DocumentFrontData;
        back?: DocumentBackData;
    } & Partial<UnifiedIdentityData>;

    @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
    documentId: string;

    @ApiProperty({ example: 'documents/front-xxx.png' })
    frontS3Key: string;

    @ApiProperty({ example: 'documents/back-xxx.png', required: false })
    backS3Key?: string;

    @ApiProperty({ example: 'Documentos procesados exitosamente' })
    message: string;
}

export interface DocumentFrontData {
    // Identificación
    id_number?: string; // Número de Cédula (NUI o No. - son lo mismo)

    // Información personal
    surnames?: string; // Apellidos
    names?: string; // Nombres
    nationality?: string; // Nacionalidad
    birth_date?: string; // Fecha de Nacimiento
    birth_place?: string; // Lugar de Nacimiento
    sex?: string; // Sexo

    // Información adicional (solo en cédula antigua)
    civil_status?: string; // Estado Civil (Solo aparece aquí en la ANTIGUA)
    spouse?: string; // Cónyuge (Solo aparece aquí en la ANTIGUA)

    // Validez del documento (solo en cédula nueva)
    expiration_date?: string; // Fecha Vencimiento (Solo aparece aquí en la NUEVA)
}

export interface DocumentBackData {
    // Información familiar
    father_name?: string; // Nombre del Padre
    mother_name?: string; // Nombre de la Madre

    // Información personal adicional
    civil_status?: string; // Estado Civil (Solo aparece aquí en la NUEVA)

    // Información profesional (solo en cédula antigua)
    profession?: string; // Profesión (Solo en la ANTIGUA)
    education?: string; // Instrucción (Solo en la ANTIGUA)

    // Información de emisión
    issue_date?: string; // Fecha de Emisión
    issue_place?: string; // Lugar de Emisión
    expiration_date?: string; // Fecha de Expiración (Solo aparece aquí en la ANTIGUA)

    // Identificación
    fingerprint_code?: string; // Código Dactilar (Ubicado arriba a la derecha en AMBAS versiones)

    // Información médica (solo en cédula nueva)
    blood_type?: string; // Tipo de Sangre (Solo en la NUEVA)
    donor_status?: string; // Donante (Solo en la NUEVA)

    // Machine Readable Zone (solo en cédula nueva)
    mrz?: string; // Zona de Lectura Mecánica (Texto inferior - Solo en la NUEVA)
}

export interface UnifiedIdentityData {
    id_number?: string;
    surnames?: string;
    names?: string;
    nationality?: string;
    birth_date?: string;
    birth_place?: string;
    sex?: string;
    civil_status?: string;
    spouse?: string;
    father_name?: string;
    mother_name?: string;
    profession?: string;
    education?: string;
    issue_date?: string;
    issue_place?: string;
    expiration_date?: string;
    fingerprint_code?: string;
    blood_type?: string;
    donor_status?: string;
    mrz?: string;
}
