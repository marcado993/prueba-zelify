import { Block } from '@aws-sdk/client-textract';
import { ExtractDocumentResponseDto } from '../dto/extract-document.dto';

export interface ExtractionContext {
    bucketName: string;
    frontS3Key: string;
    backS3Key?: string;
}

export interface IdentityStrategy {
    extract(
        frontBlocks: Block[],
        backBlocks: Block[] | null,
        context: ExtractionContext,
    ): Promise<Omit<ExtractDocumentResponseDto, 'documentId' | 'frontS3Key' | 'backS3Key'>>;

    getCountryCode(): string;
    getCountryName(): string;
}
