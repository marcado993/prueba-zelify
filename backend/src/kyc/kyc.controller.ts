import {
    Controller,
    Post,
    Body,
    Get,
    Param,
    UploadedFiles,
    UploadedFile,
    UseInterceptors,
    ParseUUIDPipe,
} from '@nestjs/common';
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';
import {
    ApiTags,
    ApiOperation,
    ApiConsumes,
    ApiBody,
    ApiResponse,
    ApiParam,
} from '@nestjs/swagger';
import { KycService } from './kyc.service';
import { ExtractDocumentResponseDto } from './dto/extract-document.dto';
import { SelfieVerificationDto } from './dto/selfie.dto';
import type { UploadedFile as UploadedFileType } from '../aws/s3.service';

@ApiTags('KYC')
@Controller('kyc')
export class KycController {
    constructor(private readonly kycService: KycService) { }

    @Post('textract')
    @UseInterceptors(
        FileFieldsInterceptor([
            { name: 'front', maxCount: 1 },
            { name: 'back', maxCount: 1 },
        ]),
    )
    @ApiOperation({
        summary: 'Extract data from ID document (front and back)',
        description:
            'Upload front and back sides of an ID document. Both will be processed with AWS Textract using country-specific strategies.',
    })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            required: ['front', 'userId', 'country'],
            properties: {
                front: {
                    type: 'string',
                    format: 'binary',
                    description: 'Front side of ID document (required)',
                },
                back: {
                    type: 'string',
                    format: 'binary',
                    description: 'Back side of ID document (optional)',
                },
                userId: {
                    type: 'string',
                    description: 'User identifier',
                    example: 'user-123',
                },
                country: {
                    type: 'string',
                    enum: ['EC', 'CO', 'MX', 'US'],
                    description: 'Country code',
                    example: 'EC',
                },
            },
        },
    })
    @ApiResponse({
        status: 201,
        description: 'Documents processed successfully',
        type: ExtractDocumentResponseDto,
    })
    @ApiResponse({ status: 400, description: 'Invalid file or parameters' })
    async extractDocument(
        @UploadedFiles()
        files: {
            front?: UploadedFileType[];
            back?: UploadedFileType[];
        },
        @Body() body: { userId: string; country: 'EC' | 'CO' | 'MX' | 'US' },
    ): Promise<ExtractDocumentResponseDto> {
        const frontFile = files.front?.[0];
        const backFile = files.back?.[0] || null;

        if (!frontFile) {
            throw new Error('Front document file is required');
        }

        return this.kycService.processDocuments(
            frontFile,
            backFile,
            body.userId,
            body.country,
        );
    }

    @Post('selfieprove')
    @UseInterceptors(FileInterceptor('selfie'))
    @ApiOperation({
        summary: 'Verify identity with selfie',
        description:
            'Upload a selfie to compare against the previously uploaded ID document using AWS Rekognition (85% threshold).',
    })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            required: ['selfie', 'documentId'],
            properties: {
                selfie: {
                    type: 'string',
                    format: 'binary',
                    description: 'Selfie image',
                },
                documentId: {
                    type: 'string',
                    format: 'uuid',
                    description: 'Document ID from textract response',
                },
            },
        },
    })
    @ApiResponse({
        status: 201,
        description: 'Selfie verification completed',
        type: SelfieVerificationDto,
    })
    async verifySelfie(
        @UploadedFile() file: UploadedFileType,
        @Body() body: { documentId: string },
    ): Promise<SelfieVerificationDto> {
        return this.kycService.verifySelfie(file, body.documentId);
    }
}
