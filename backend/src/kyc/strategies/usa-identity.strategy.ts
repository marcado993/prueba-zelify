import { Block } from '@aws-sdk/client-textract';
import { ExtractDocumentResponseDto, DocumentFrontData, DocumentBackData } from '../dto/extract-document.dto';
import { IdentityStrategy, ExtractionContext } from './identity-strategy.interface';
import { Logger, Injectable } from '@nestjs/common';

@Injectable()
export class USAIdentityStrategy implements IdentityStrategy {
    private readonly logger = new Logger(USAIdentityStrategy.name);

    getCountryCode(): string {
        return 'US';
    }

    getCountryName(): string {
        return 'USA';
    }

    async extract(
        frontBlocks: Block[],
        backBlocks: Block[] | null,
        context: ExtractionContext,
    ): Promise<Omit<ExtractDocumentResponseDto, 'documentId' | 'frontS3Key' | 'backS3Key'>> {
        this.logger.log('🇺🇸 Using USAIdentityStrategy');

        const frontData = this.extractFrontData(frontBlocks);
        const backData = backBlocks ? this.extractBackData(backBlocks) : undefined;

        return {
            success: true,
            data: {
                front: frontData,
                back: backData,
            },
            message: 'Documentos procesados exitosamente (USA)',
        };
    }

    private extractFrontData(blocks: Block[]): DocumentFrontData {
        const lines = this.extractLines(blocks);

        return {
            id_number: this.extractLicenseNumber(lines),
            surnames: this.extractValue(lines, ['LN', 'LAST NAME', 'SURNAME']),
            names: this.extractValue(lines, ['FN', 'FIRST NAME', 'GIVEN NAME']),
            nationality: 'USA',
            birth_date: this.extractValue(lines, ['DOB', 'DATE OF BIRTH']),
            sex: this.extractSex(lines),
            expiration_date: this.extractValue(lines, ['EXP', 'EXPIRES', 'EXPIRATION']),
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

    private extractLicenseNumber(lines: string[]): string | undefined {
        for (let i = 0; i < lines.length; i++) {
            const lineUpper = lines[i].toUpperCase();
            if (lineUpper.includes('DL') || lineUpper.includes('LICENSE')) {
                const match = lines[i].match(/[A-Z]\d{7,8}/);
                if (match) return match[0];
                if (i + 1 < lines.length) {
                    const nextMatch = lines[i + 1].match(/[A-Z]\d{7,8}/);
                    if (nextMatch) return nextMatch[0];
                }
            }
        }
        // Direct search
        for (const line of lines) {
            const match = line.match(/[A-Z]\d{7,8}/);
            if (match) return match[0];
        }
        return undefined;
    }

    private extractValue(lines: string[], labels: string[]): string | undefined {
        for (let i = 0; i < lines.length; i++) {
            const lineUpper = lines[i].toUpperCase();
            for (const label of labels) {
                if (lineUpper.includes(label)) {
                    const parts = lines[i].split(/[:\s]/);
                    const labelIdx = parts.findIndex(p => p.toUpperCase().includes(label.split(' ')[0]));
                    if (labelIdx >= 0 && labelIdx + 1 < parts.length) {
                        return parts.slice(labelIdx + 1).join(' ').trim();
                    }
                    if (i + 1 < lines.length) return lines[i + 1];
                }
            }
        }
        return undefined;
    }

    private extractSex(lines: string[]): string | undefined {
        for (const line of lines) {
            const lineUpper = line.toUpperCase();
            if (lineUpper.includes('SEX')) {
                if (lineUpper.includes('M')) return 'MALE';
                if (lineUpper.includes('F')) return 'FEMALE';
            }
        }
        return undefined;
    }

    private extractMRZ(lines: string[]): string | undefined {
        const mrzLines = lines.filter(line => line.includes('<<') && line.length > 20);
        return mrzLines.length > 0 ? mrzLines.join('\n') : undefined;
    }
}
