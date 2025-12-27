import { Block } from '@aws-sdk/client-textract';
import { ExtractDocumentResponseDto, DocumentFrontData, DocumentBackData } from '../dto/extract-document.dto';
import { IdentityStrategy, ExtractionContext } from './identity-strategy.interface';
import { Logger, Injectable } from '@nestjs/common';

@Injectable()
export class EcuadorIdentityStrategy implements IdentityStrategy {
    private readonly logger = new Logger(EcuadorIdentityStrategy.name);

    getCountryCode(): string {
        return 'EC';
    }

    getCountryName(): string {
        return 'Ecuador';
    }

    async extract(
        frontBlocks: Block[],
        backBlocks: Block[] | null,
        context: ExtractionContext,
    ): Promise<Omit<ExtractDocumentResponseDto, 'documentId' | 'frontS3Key' | 'backS3Key'>> {
        this.logger.log('🇪🇨 Using EcuadorIdentityStrategy');

        const frontLines = this.extractLines(frontBlocks);
        const backLines = backBlocks ? this.extractLines(backBlocks) : [];

        this.logger.log(`Front lines (${frontLines.length}): ${JSON.stringify(frontLines)}`);
        this.logger.log(`Back lines (${backLines.length}): ${JSON.stringify(backLines)}`);

        const frontData = this.extractFrontData(frontLines);
        const backData = backBlocks ? this.extractBackData(backLines) : undefined;

        // Enrich with MRZ data as fallback
        const mrzData = this.extractFromMRZ(backLines);
        if (mrzData) {
            if (!frontData.id_number) frontData.id_number = mrzData.id_number;
            if (!frontData.surnames) frontData.surnames = mrzData.surnames;
            if (!frontData.names) frontData.names = mrzData.names;
            if (!frontData.sex) frontData.sex = mrzData.sex;
        }

        return {
            success: true,
            data: {
                front: frontData,
                back: backData,
            },
            message: 'Documentos procesados exitosamente (Ecuador)',
        };
    }

    private extractFrontData(lines: string[]): DocumentFrontData {
        this.logger.log('Extracting front data from Ecuador cédula');

        return {
            id_number: this.extractIdNumber(lines),
            surnames: this.extractSurnames(lines),
            names: this.extractNames(lines),
            nationality: this.extractNationality(lines),
            birth_date: this.extractBirthDate(lines),
            birth_place: this.extractBirthPlace(lines),
            sex: this.extractSex(lines),
            expiration_date: this.extractExpirationDate(lines),
        };
    }

    private extractBackData(lines: string[]): DocumentBackData {
        this.logger.log('Extracting back data from Ecuador cédula');

        return {
            father_name: this.extractParentName(lines, 'PADRE'),
            mother_name: this.extractParentName(lines, 'MADRE'),
            civil_status: this.extractCivilStatus(lines),
            issue_date: this.extractIssueDate(lines),
            issue_place: this.extractIssuePlace(lines),
            fingerprint_code: this.extractFingerprintCode(lines),
            blood_type: this.extractBloodType(lines),
            donor_status: this.extractDonorStatus(lines),
            mrz: this.extractMRZ(lines),
        };
    }

    private extractLines(blocks: Block[]): string[] {
        return blocks
            .filter((block) => block.BlockType === 'LINE')
            .map((block) => block.Text || '')
            .filter((text) => text.length > 0);
    }

    // ===== FRONT EXTRACTORS =====

    private extractIdNumber(lines: string[]): string | undefined {
        // Look for NUI.XXXXXXXXXX pattern
        for (const line of lines) {
            const nuiMatch = line.match(/NUI[.\s]*(\d{10})/i);
            if (nuiMatch) return nuiMatch[1];
        }

        // Look for No. DOCUMENTO followed by number
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].toUpperCase().includes('DOCUMENTO')) {
                for (let j = i; j < Math.min(i + 3, lines.length); j++) {
                    const match = lines[j].match(/\b(\d{9,10})\b/);
                    if (match) return match[1];
                }
            }
        }

        // Look for standalone 10-digit number
        for (const line of lines) {
            const match = line.match(/\b(\d{10})\b/);
            if (match) return match[1];
        }

        return undefined;
    }

    private extractSurnames(lines: string[]): string | undefined {
        // Find APELLIDOS label and collect lines until NOMBRES
        for (let i = 0; i < lines.length; i++) {
            const lineUpper = lines[i].toUpperCase();
            if (lineUpper.includes('APELLIDOS') && !lineUpper.includes('PADRE') && !lineUpper.includes('MADRE')) {
                const surnames: string[] = [];

                // Collect next lines until we hit NOMBRES or another label
                for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
                    const nextUpper = lines[j].toUpperCase();
                    if (nextUpper.includes('NOMBRES') || nextUpper.includes('CONDICIÓN') ||
                        nextUpper.includes('NACIONALIDAD') || nextUpper.includes('FECHA')) {
                        break;
                    }
                    if (lines[j].trim().length > 0 && this.isNameLine(lines[j])) {
                        surnames.push(lines[j].trim());
                    }
                }

                if (surnames.length > 0) {
                    return surnames.join(' ');
                }
            }
        }
        return undefined;
    }

    private extractNames(lines: string[]): string | undefined {
        for (let i = 0; i < lines.length; i++) {
            const lineUpper = lines[i].toUpperCase();
            if (lineUpper === 'NOMBRES' || (lineUpper.includes('NOMBRES') && !lineUpper.includes('PADRE') && !lineUpper.includes('MADRE'))) {
                // Next line should be the name
                for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
                    const nextUpper = lines[j].toUpperCase();
                    if (nextUpper.includes('NACIONALIDAD') || nextUpper.includes('FECHA') || nextUpper.includes('SEXO')) {
                        break;
                    }
                    if (lines[j].trim().length > 0 && this.isNameLine(lines[j])) {
                        return lines[j].trim();
                    }
                }
            }
        }
        return undefined;
    }

    private extractNationality(lines: string[]): string | undefined {
        for (let i = 0; i < lines.length; i++) {
            const lineUpper = lines[i].toUpperCase();
            if (lineUpper.includes('NACIONALIDAD')) {
                if (i + 1 < lines.length && !lines[i + 1].toUpperCase().includes('FECHA')) {
                    return lines[i + 1].trim();
                }
            }
        }
        // Default for Ecuador
        return 'ECUATORIANA';
    }

    private extractBirthDate(lines: string[]): string | undefined {
        // Pattern: DD MMM YYYY or DD-MM-YYYY
        const datePattern = /\b(\d{1,2}\s+[A-Z]{3}\s+\d{4})\b/i;

        for (let i = 0; i < lines.length; i++) {
            const lineUpper = lines[i].toUpperCase();
            if (lineUpper.includes('FECHA DE NACIMIENTO') || lineUpper.includes('NACIMIENTO')) {
                // Check next few lines for date
                for (let j = i; j < Math.min(i + 3, lines.length); j++) {
                    const match = lines[j].match(datePattern);
                    if (match) return match[1];
                }
            }
        }
        return undefined;
    }

    private extractBirthPlace(lines: string[]): string | undefined {
        for (let i = 0; i < lines.length; i++) {
            const lineUpper = lines[i].toUpperCase();
            if (lineUpper.includes('LUGAR DE NACIMIENTO')) {
                // Collect next lines until we hit another label
                const places: string[] = [];
                for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
                    const nextUpper = lines[j].toUpperCase();
                    if (nextUpper.includes('FIRMA') || nextUpper.includes('SEXO') ||
                        nextUpper.includes('FECHA') || nextUpper.includes('DOCUMENTO')) {
                        break;
                    }
                    if (lines[j].trim().length > 0 && !this.isLabelLine(lines[j])) {
                        places.push(lines[j].trim());
                    }
                }
                if (places.length > 0) {
                    return places.join(' ');
                }
            }
        }
        return undefined;
    }

    private extractSex(lines: string[]): string | undefined {
        // Look for SEXO label
        for (let i = 0; i < lines.length; i++) {
            const lineUpper = lines[i].toUpperCase();
            if (lineUpper === 'SEXO' || lineUpper.includes('SEXO')) {
                // Check next line for HOMBRE/MUJER
                if (i + 1 < lines.length) {
                    const nextUpper = lines[i + 1].toUpperCase();
                    if (nextUpper.includes('HOMBRE') || nextUpper === 'M' || nextUpper === 'MASCULINO') {
                        return 'HOMBRE';
                    }
                    if (nextUpper.includes('MUJER') || nextUpper === 'F' || nextUpper === 'FEMENINO') {
                        return 'MUJER';
                    }
                }
            }
        }

        // Direct search for HOMBRE/MUJER keywords
        for (const line of lines) {
            const upper = line.toUpperCase();
            if (upper === 'HOMBRE' || upper === 'MASCULINO') return 'HOMBRE';
            if (upper === 'MUJER' || upper === 'FEMENINO') return 'MUJER';
        }

        return undefined;
    }

    private extractExpirationDate(lines: string[]): string | undefined {
        const datePattern = /\b(\d{1,2}\s+[A-Z]{3}\s+\d{4})\b/i;

        for (let i = 0; i < lines.length; i++) {
            const lineUpper = lines[i].toUpperCase();
            if (lineUpper.includes('VENCIMIENTO') || lineUpper.includes('FECHA DE VENCIMIENTO')) {
                // Check next few lines for date
                for (let j = i; j < Math.min(i + 3, lines.length); j++) {
                    const match = lines[j].match(datePattern);
                    if (match) return match[1];
                }
            }
        }
        return undefined;
    }

    // ===== BACK EXTRACTORS =====

    private extractParentName(lines: string[], parentType: 'PADRE' | 'MADRE'): string | undefined {
        for (let i = 0; i < lines.length; i++) {
            const lineUpper = lines[i].toUpperCase();
            if (lineUpper.includes(parentType) && lineUpper.includes('NOMBRE')) {
                // Next line should be the parent name
                if (i + 1 < lines.length) {
                    const nextLine = lines[i + 1].trim();
                    if (nextLine.length > 0 && this.isNameLine(nextLine) && !this.isLabelLine(nextLine)) {
                        return nextLine;
                    }
                }
            }
        }
        return undefined;
    }

    private extractCivilStatus(lines: string[]): string | undefined {
        for (let i = 0; i < lines.length; i++) {
            const lineUpper = lines[i].toUpperCase();
            if (lineUpper.includes('ESTADO CIVIL')) {
                if (i + 1 < lines.length) {
                    const status = lines[i + 1].trim().toUpperCase();
                    if (['SOLTERO', 'CASADO', 'DIVORCIADO', 'VIUDO', 'UNIÓN LIBRE', 'UNION LIBRE'].includes(status)) {
                        return status;
                    }
                }
            }
        }

        // Direct search
        for (const line of lines) {
            const upper = line.toUpperCase().trim();
            if (['SOLTERO', 'CASADO', 'DIVORCIADO', 'VIUDO'].includes(upper)) {
                return upper;
            }
        }
        return undefined;
    }

    private extractIssueDate(lines: string[]): string | undefined {
        const datePattern = /\b(\d{1,2}\s+[A-Z]{3}\s+\d{4})\b/i;

        for (let i = 0; i < lines.length; i++) {
            const lineUpper = lines[i].toUpperCase();
            if (lineUpper.includes('EMISIÓN') || lineUpper.includes('EMISION') || lineUpper.includes('FECHA Y LUGAR')) {
                // Check next lines for date
                for (let j = i; j < Math.min(i + 3, lines.length); j++) {
                    const match = lines[j].match(datePattern);
                    if (match) return match[1];
                }
            }
        }
        return undefined;
    }

    private extractIssuePlace(lines: string[]): string | undefined {
        for (let i = 0; i < lines.length; i++) {
            const lineUpper = lines[i].toUpperCase();
            if (lineUpper.includes('EMISIÓN') || lineUpper.includes('EMISION') || lineUpper.includes('FECHA Y LUGAR')) {
                // Next line often has "CITY DD MMM YYYY"
                if (i + 1 < lines.length) {
                    const nextLine = lines[i + 1];
                    // Extract city (before the date)
                    const match = nextLine.match(/^([A-ZÁÉÍÓÚÑ\s]+)\s+\d{1,2}/i);
                    if (match) return match[1].trim();

                    // If no date in same line, just return the city name
                    if (!nextLine.match(/\d{1,2}\s+[A-Z]{3}\s+\d{4}/i) &&
                        !this.isLabelLine(nextLine) &&
                        nextLine.trim().length > 0) {
                        return nextLine.trim().split(' ')[0]; // First word is usually city
                    }
                }
            }
        }
        return undefined;
    }

    private extractFingerprintCode(lines: string[]): string | undefined {
        // Código dactilar format: letter + numbers (e.g., E334412244, A1131A1121)
        const codePattern = /\b([A-Z]\d{4}[A-Z]?\d{4,5})\b/;

        for (let i = 0; i < lines.length; i++) {
            const lineUpper = lines[i].toUpperCase();
            if (lineUpper.includes('CÓDIGO DACTILAR') || lineUpper.includes('CODIGO DACTILAR')) {
                // Check next few lines for the code
                for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
                    const match = lines[j].match(codePattern);
                    if (match) return match[1];
                }
            }
        }

        // Direct search for pattern
        for (const line of lines) {
            const match = line.match(codePattern);
            if (match) return match[1];
        }

        return undefined;
    }

    private extractBloodType(lines: string[]): string | undefined {
        const bloodPattern = /\b(O|A|B|AB)\s*[+-]\s*|N\/R\b/i;

        for (let i = 0; i < lines.length; i++) {
            const lineUpper = lines[i].toUpperCase();
            if (lineUpper.includes('TIPO') && lineUpper.includes('SANGRE')) {
                // Check same line and next line
                const match = lines[i].match(bloodPattern);
                if (match) return match[0].trim();

                if (i + 1 < lines.length) {
                    const nextMatch = lines[i + 1].match(bloodPattern);
                    if (nextMatch) return nextMatch[0].trim();
                    // Check for N/R
                    if (lines[i + 1].trim().toUpperCase() === 'N/R') return 'N/R';
                }
            }
        }

        // Direct search
        for (const line of lines) {
            if (line.trim().toUpperCase() === 'N/R') return 'N/R';
            const match = line.match(/\b(O|A|B|AB)[+-]\b/i);
            if (match) return match[0];
        }

        return undefined;
    }

    private extractDonorStatus(lines: string[]): string | undefined {
        for (let i = 0; i < lines.length; i++) {
            const lineUpper = lines[i].toUpperCase();
            if (lineUpper.includes('DONANTE')) {
                // Check same line
                if (lineUpper.includes('NO DONANTE')) return 'No';
                if (lineUpper.includes('SI') || lineUpper.includes('SÍ')) return 'Si';

                // Check next line
                if (i + 1 < lines.length) {
                    const next = lines[i + 1].toUpperCase().trim();
                    if (next === 'SI' || next === 'SÍ') return 'Si';
                    if (next === 'NO') return 'No';
                }
            }
        }

        // Direct search
        const text = lines.join(' ').toUpperCase();
        if (text.includes('NO DONANTE')) return 'No';

        return undefined;
    }

    private extractMRZ(lines: string[]): string | undefined {
        const mrzLines = lines.filter(line =>
            (line.includes('<<') && line.length > 20) ||
            line.match(/^I<ECU/) ||
            line.match(/^\d{7}[MF]\d{7}/)
        );
        return mrzLines.length > 0 ? mrzLines.join('\n') : undefined;
    }

    private extractFromMRZ(lines: string[]): { id_number?: string; surnames?: string; names?: string; sex?: string } | null {
        const mrzLines = lines.filter(line =>
            (line.includes('<<') && line.length > 20) ||
            line.match(/^I<ECU/) ||
            line.match(/^\d{7}[MF]\d{7}/)
        );

        if (mrzLines.length < 2) return null;

        try {
            const result: any = {};

            // Line 1: I<ECU + document number + NUI
            const line1 = mrzLines.find(l => l.match(/^I<ECU/));
            if (line1) {
                const nuiMatch = line1.match(/(\d{10})$/);
                if (nuiMatch) result.id_number = nuiMatch[1];
            }

            // Line 2: birthdate + sex
            const line2 = mrzLines.find(l => l.match(/\d{6}\d[MF]/));
            if (line2) {
                const sexMatch = line2.match(/\d{6}\d([MF])/);
                if (sexMatch) {
                    result.sex = sexMatch[1] === 'M' ? 'HOMBRE' : 'MUJER';
                }
            }

            // Line 3: surnames<<names
            const line3 = mrzLines.find(l => l.match(/^[A-Z]+</) && !l.match(/^I<ECU/));
            if (line3) {
                const parts = line3.split('<<');
                if (parts.length >= 2) {
                    result.surnames = parts[0].replace(/</g, ' ').trim();
                    result.names = parts[1].replace(/</g, ' ').trim();
                }
            }

            return Object.keys(result).length > 0 ? result : null;
        } catch (e) {
            this.logger.error('Error parsing MRZ', e);
            return null;
        }
    }

    // ===== HELPERS =====

    private isNameLine(line: string): boolean {
        // Names are usually all uppercase letters and spaces
        return /^[A-ZÁÉÍÓÚÑ\s]+$/.test(line.trim()) && line.trim().length > 1;
    }

    private isLabelLine(line: string): boolean {
        const labels = [
            'APELLIDOS', 'NOMBRES', 'SEXO', 'NACIONALIDAD', 'FECHA', 'CÉDULA',
            'LUGAR', 'DOCUMENTO', 'NACIMIENTO', 'VENCIMIENTO', 'PADRE', 'MADRE',
            'ESTADO CIVIL', 'CÓDIGO', 'TIPO', 'DONANTE', 'CONDICIÓN', 'CIUDADANIA',
            'REPÚBLICA', 'ECUADOR', 'DIRECCIÓN', 'CEDULACIÓN', 'NUI', 'FIRMA',
            'EMISIÓN', 'EMISION', 'DACTILAR', 'SANGRE', 'REGISTRO', 'GENERAL'
        ];
        const lineUpper = line.toUpperCase().trim();
        return labels.some(label => lineUpper.includes(label));
    }
}
