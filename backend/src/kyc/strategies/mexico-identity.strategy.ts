import { Block } from '@aws-sdk/client-textract';
import { ExtractDocumentResponseDto, DocumentFrontData, DocumentBackData } from '../dto/extract-document.dto';
import { IdentityStrategy, ExtractionContext } from './identity-strategy.interface';
import { Logger, Injectable } from '@nestjs/common';

@Injectable()
export class MexicoIdentityStrategy implements IdentityStrategy {
    private readonly logger = new Logger(MexicoIdentityStrategy.name);

    getCountryCode(): string {
        return 'MX';
    }

    getCountryName(): string {
        return 'Mexico';
    }

    async extract(
        frontBlocks: Block[],
        backBlocks: Block[] | null,
        context: ExtractionContext,
    ): Promise<Omit<ExtractDocumentResponseDto, 'documentId' | 'frontS3Key' | 'backS3Key'>> {
        this.logger.log('🇲🇽 Using MexicoIdentityStrategy');

        const frontData = this.extractFrontData(frontBlocks);
        const backData = backBlocks ? this.extractBackData(backBlocks) : undefined;

        return {
            success: true,
            data: {
                front: frontData,
                back: backData,
            },
            message: 'Documentos procesados exitosamente (Mexico)',
        };
    }

    private extractFrontData(blocks: Block[]): DocumentFrontData {
        const lines = this.extractLines(blocks);

        return {
            id_number: this.extractClaveElector(lines) || this.extractCurp(lines),
            surnames: this.extractSurnames(lines),
            names: this.extractNames(lines),
            nationality: 'MEXICANA',
            birth_date: this.extractDate(lines, ['NACIMIENTO', 'FECHA DE NACIMIENTO']),
            sex: this.extractSex(lines),
            expiration_date: this.extractDate(lines, ['VIGENCIA']),
        };
    }

    private extractBackData(blocks: Block[]): DocumentBackData {
        const lines = this.extractLines(blocks);

        return {
            mrz: this.extractMRZ(lines),
        };
    }

    private extractLines(blocks: Block[]): string[] {
        return blocks
            .filter((block) => block.BlockType === 'LINE')
            .map((block) => block.Text || '')
            .filter((text) => text.length > 0);
    }

    private extractClaveElector(lines: string[]): string | undefined {
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].toUpperCase().includes('ELECTOR')) {
                for (let j = i; j < Math.min(i + 3, lines.length); j++) {
                    const match = lines[j].match(/[A-Z]{6}\d{8}[A-Z]\d{3}/) || lines[j].match(/[A-Z]{4,6}\d{6,14}[A-Z0-9]*/);
                    if (match) return match[0];
                }
            }
        }
        return undefined;
    }

    private extractCurp(lines: string[]): string | undefined {
        const curpPattern = /[A-Z]{4}\d{6}[HM][A-Z]{2}[A-Z]{3}[A-Z0-9]\d/;
        for (const line of lines) {
            const match = line.match(curpPattern);
            if (match) return match[0];
        }
        return undefined;
    }

    private extractSurnames(lines: string[]): string | undefined {
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].toUpperCase() === 'NOMBRE') {
                if (i + 2 < lines.length) {
                    return lines[i + 1] + ' ' + lines[i + 2];
                }
            }
        }
        return undefined;
    }

    private extractNames(lines: string[]): string | undefined {
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].toUpperCase() === 'NOMBRE') {
                if (i + 3 < lines.length) {
                    return lines[i + 3];
                }
            }
        }
        return undefined;
    }

    private extractDate(lines: string[], labels: string[]): string | undefined {
        const datePattern = /\d{2}[\/\-]\d{2}[\/\-]\d{4}|\d{4}/;
        for (let i = 0; i < lines.length; i++) {
            const lineUpper = lines[i].toUpperCase();
            for (const label of labels) {
                if (lineUpper.includes(label)) {
                    const match = lines[i].match(datePattern);
                    if (match) return match[0];
                    if (i + 1 < lines.length) {
                        const nextMatch = lines[i + 1].match(datePattern);
                        if (nextMatch) return nextMatch[0];
                    }
                }
            }
        }
        return undefined;
    }

    private extractSex(lines: string[]): string | undefined {
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].toUpperCase().includes('SEXO')) {
                const content = (lines[i] + ' ' + (lines[i + 1] || '')).toUpperCase();
                if (content.includes(' M ') || content.endsWith(' M')) return 'MUJER';
                if (content.includes(' H ') || content.endsWith(' H')) return 'HOMBRE';
            }
        }
        return undefined;
    }

    private extractMRZ(lines: string[]): string | undefined {
        const mrzLines = lines.filter(line => line.startsWith('I<') || (line.includes('<<') && line.length > 20));
        return mrzLines.length > 0 ? mrzLines.join('\n') : undefined;
    }
}
