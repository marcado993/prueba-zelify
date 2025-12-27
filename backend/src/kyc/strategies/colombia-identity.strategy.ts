import { Block } from '@aws-sdk/client-textract';
import { ExtractDocumentResponseDto, DocumentFrontData, DocumentBackData, UnifiedIdentityData } from '../dto/extract-document.dto';
import { IdentityStrategy, ExtractionContext } from './identity-strategy.interface';
import { Logger, Injectable } from '@nestjs/common';

@Injectable()
export class ColombiaIdentityStrategy implements IdentityStrategy {
    private readonly logger = new Logger(ColombiaIdentityStrategy.name);

    getCountryCode(): string {
        return 'CO';
    }

    getCountryName(): string {
        return 'Colombia';
    }

    async extract(
        frontBlocks: Block[],
        backBlocks: Block[] | null,
        context: ExtractionContext,
    ): Promise<Omit<ExtractDocumentResponseDto, 'documentId' | 'frontS3Key' | 'backS3Key'>> {
        this.logger.log('🇨🇴 Using ColombiaIdentityStrategy');

        const frontLines = this.extractLines(frontBlocks);
        const backLines = backBlocks ? this.extractLines(backBlocks) : [];

        const isDigital = this.detectDigitalId(frontLines, backLines);
        this.logger.log(`🔍 Detected ID Type: ${isDigital ? 'DIGITAL' : 'HOLOGRAMAS'}`);

        const frontData = isDigital
            ? this.extractFrontDataDigital(frontLines)
            : this.extractFrontDataHologramas(frontLines);

        const backData = backBlocks
            ? (isDigital ? this.extractBackDataDigital(backLines) : this.extractBackDataHologramas(backLines))
            : undefined;

        return {
            success: true,
            data: {
                front: frontData,
                back: backData,
            },
            message: 'Documentos procesados exitosamente (Colombia)',
        };
    }

    private detectDigitalId(frontLines: string[], backLines: string[]): boolean {
        const allText = [...frontLines, ...backLines].join(' ').toUpperCase();
        if (allText.includes('NUIP')) return true;
        if (backLines.some(l => l.includes('<<') && l.includes('COL'))) return true;
        return false;
    }

    private extractFrontDataDigital(lines: string[]): DocumentFrontData {
        return {
            id_number: this.extractValueBelow(lines, ['NUIP', 'NUMERO']),
            surnames: this.extractValueBelow(lines, ['APELLIDOS']),
            names: this.extractValueBelow(lines, ['NOMBRES']),
            nationality: 'COLOMBIANA',
            birth_date: this.extractValueBelow(lines, ['FECHA DE NACIMIENTO']),
            birth_place: this.extractValueBelow(lines, ['LUGAR DE NACIMIENTO']),
            sex: this.extractValueBelow(lines, ['SEXO']),
            expiration_date: this.extractValueBelow(lines, ['FECHA DE EXPIRACION', 'VENCIMIENTO']),
        };
    }

    private extractBackDataDigital(lines: string[]): DocumentBackData {
        return {
            blood_type: this.extractValueBelow(lines, ['G.S.', 'RH']),
            mrz: this.extractMRZ(lines),
        };
    }

    private extractFrontDataHologramas(lines: string[]): DocumentFrontData {
        return {
            id_number: this.extractIdNumberHologramas(lines),
            surnames: this.extractValueAbove(lines, ['APELLIDOS']),
            names: this.extractValueAbove(lines, ['NOMBRES']),
            nationality: 'COLOMBIANA',
        };
    }

    private extractBackDataHologramas(lines: string[]): DocumentBackData {
        return {
            issue_date: this.extractValueBelow(lines, ['FECHA DE EXPEDICION']),
            blood_type: this.extractBloodHologramas(lines),
            civil_status: this.extractValueBelow(lines, ['ESTADO CIVIL']),
        };
    }

    private extractLines(blocks: Block[]): string[] {
        return blocks
            .filter((block) => block.BlockType === 'LINE')
            .map((block) => block.Text || '')
            .filter((text) => text.length > 0);
    }

    private extractValueBelow(lines: string[], labels: string[]): string | undefined {
        for (let i = 0; i < lines.length; i++) {
            const lineUpper = lines[i].toUpperCase();
            if (labels.some(label => lineUpper.includes(label))) {
                if (i + 1 < lines.length) return lines[i + 1];
            }
        }
        return undefined;
    }

    private extractValueAbove(lines: string[], labels: string[]): string | undefined {
        for (let i = 0; i < lines.length; i++) {
            const lineUpper = lines[i].toUpperCase();
            if (labels.some(label => lineUpper.includes(label))) {
                if (i > 0) return lines[i - 1];
            }
        }
        return undefined;
    }

    private extractValueAboveMulti(lines: string[], labels: string[]): string | undefined {
        for (let i = 0; i < lines.length; i++) {
            const lineUpper = lines[i].toUpperCase();
            if (labels.some(label => lineUpper.includes(label))) {
                if (i > 0) {
                    let val = lines[i - 1];
                    if (i > 1 && !/\d/.test(lines[i - 2]) && !lines[i - 2].includes('FECHA')) {
                        val = lines[i - 2] + ' ' + val;
                    }
                    return val;
                }
            }
        }
        return undefined;
    }

    private extractSexHologramas(lines: string[]): string | undefined {
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].toUpperCase().includes('SEXO')) {
                for (let j = 1; j <= 5 && i - j >= 0; j++) {
                    const val = lines[i - j].toUpperCase().trim();
                    if (val === 'M' || val === 'HOMBRE') return 'HOMBRE';
                    if (val === 'F' || val === 'MUJER') return 'MUJER';
                }
            }
        }
        return undefined;
    }

    private extractBloodHologramas(lines: string[]): string | undefined {
        const bloodPattern = /^(O|A|B|AB)\s*[+-]$/i;
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].toUpperCase().includes('G.S.') || lines[i].toUpperCase().includes('RH')) {
                for (let j = 1; j <= 5 && i - j >= 0; j++) {
                    const val = lines[i - j].trim();
                    if (bloodPattern.test(val)) return val;
                }
            }
        }
        return undefined;
    }

    private extractIdNumberHologramas(lines: string[]): string | undefined {
        for (let i = 0; i < lines.length; i++) {
            const lineUpper = lines[i].toUpperCase();
            if (lineUpper.includes('NUMERO') || lineUpper.includes('NÚMERO')) {
                for (let j = i; j < Math.min(i + 3, lines.length); j++) {
                    const match = lines[j].match(/\d{1,3}[.,]\d{3}[.,]\d{3}(?:[.,]\d{3})?/);
                    if (match) return match[0].replace(/[.,]/g, '');
                    const rawMatch = lines[j].match(/\b\d{8,10}\b/);
                    if (rawMatch) return rawMatch[0];
                }
            }
        }
        return undefined;
    }

    private extractMRZ(lines: string[]): string | undefined {
        const mrzLines = lines.filter(line => line.includes('<<') && line.length > 20);
        return mrzLines.length > 0 ? mrzLines.join('\n') : undefined;
    }
}
