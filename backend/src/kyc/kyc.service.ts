import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KycDocument } from './entities/kyc-document.entity';
import { S3Service, UploadedFile } from '../aws/s3.service';
import { TextractService } from '../aws/textract.service';
import { RekognitionService } from '../aws/rekognition.service';
import { ExtractDocumentResponseDto } from './dto/extract-document.dto';
import { SelfieVerificationDto } from './dto/selfie.dto';
import {
    IdentityStrategy,
    EcuadorIdentityStrategy,
    ColombiaIdentityStrategy,
    MexicoIdentityStrategy,
    USAIdentityStrategy,
} from './strategies';

type CountryCode = 'EC' | 'CO' | 'MX' | 'US';

@Injectable()
export class KycService {
    private strategies: Map<CountryCode, IdentityStrategy>;

    constructor(
        @InjectRepository(KycDocument)
        private kycDocumentRepository: Repository<KycDocument>,
        private s3Service: S3Service,
        private textractService: TextractService,
        private rekognitionService: RekognitionService,
    ) {
        // Initialize strategies
        this.strategies = new Map<CountryCode, IdentityStrategy>();
        this.strategies.set('EC', new EcuadorIdentityStrategy());
        this.strategies.set('CO', new ColombiaIdentityStrategy());
        this.strategies.set('MX', new MexicoIdentityStrategy());
        this.strategies.set('US', new USAIdentityStrategy());
    }

    async processDocuments(
        frontFile: UploadedFile,
        backFile: UploadedFile | null,
        userId: string,
        country: CountryCode,
    ): Promise<ExtractDocumentResponseDto> {
        // Validate front file
        if (!frontFile) {
            throw new BadRequestException('Front document file is required');
        }

        const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg'];
        if (!allowedMimeTypes.includes(frontFile.mimetype)) {
            throw new BadRequestException('Only JPEG and PNG images are allowed');
        }

        // Get strategy
        const strategy = this.strategies.get(country);
        if (!strategy) {
            throw new BadRequestException(`Unsupported country code: ${country}`);
        }

        try {
            // Upload front document to S3
            console.log('Uploading front document to S3...');
            const { key: frontS3Key, url: frontS3Url } = await this.s3Service.uploadFile(
                frontFile,
                'documents/front',
            );
            console.log('Front uploaded:', frontS3Key);

            // Upload back document if provided
            let backS3Key: string | undefined;
            let backS3Url: string | undefined;
            if (backFile && allowedMimeTypes.includes(backFile.mimetype)) {
                console.log('Uploading back document to S3...');
                const backUpload = await this.s3Service.uploadFile(backFile, 'documents/back');
                backS3Key = backUpload.key;
                backS3Url = backUpload.url;
                console.log('Back uploaded:', backS3Key);
            }

            // Analyze documents with Textract
            console.log('Analyzing front with Textract...');
            const frontBlocks = await this.textractService.analyzeDocumentFromS3(
                this.s3Service.getBucketName(),
                frontS3Key,
            );

            let backBlocks: any[] | null = null;
            if (backS3Key) {
                console.log('Analyzing back with Textract...');
                backBlocks = await this.textractService.analyzeDocumentFromS3(
                    this.s3Service.getBucketName(),
                    backS3Key,
                );
            }

            // Extract data using strategy
            const extractionResult = await strategy.extract(frontBlocks, backBlocks, {
                bucketName: this.s3Service.getBucketName(),
                frontS3Key,
                backS3Key,
            });

            // Create KYC document record
            const kycDocument = this.kycDocumentRepository.create({
                userId,
                country,
                documentNumber: extractionResult.data.front?.id_number || '',
                fullName: `${extractionResult.data.front?.surnames || ''} ${extractionResult.data.front?.names || ''}`.trim(),
                firstName: extractionResult.data.front?.names || '',
                lastName: extractionResult.data.front?.surnames || '',
                dateOfBirth: extractionResult.data.front?.birth_date || '',
                nationality: extractionResult.data.front?.nationality || '',
                gender: extractionResult.data.front?.sex || '',
                documentS3Key: frontS3Key,
                documentS3Url: frontS3Url,
                status: 'document_uploaded',
                rawExtractedText: JSON.stringify(extractionResult.data),
            });

            const savedDocument = await this.kycDocumentRepository.save(kycDocument);

            return {
                ...extractionResult,
                documentId: savedDocument.id,
                frontS3Key,
                backS3Key,
            };
        } catch (error) {
            console.error('Error processing documents:', error);
            if (error.name === 'AccessDenied' || error.Code === 'AccessDenied') {
                throw new BadRequestException('AWS Access Denied. Check IAM permissions.');
            }
            if (error.name === 'SubscriptionRequiredException') {
                throw new BadRequestException('AWS Textract service needs to be activated in your AWS account.');
            }
            throw error;
        }
    }

    async verifySelfie(
        file: UploadedFile,
        documentId: string,
    ): Promise<SelfieVerificationDto> {
        if (!file) {
            throw new BadRequestException('Selfie file is required');
        }

        const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg'];
        if (!allowedMimeTypes.includes(file.mimetype)) {
            throw new BadRequestException('Only JPEG and PNG images are allowed');
        }

        const kycDocument = await this.kycDocumentRepository.findOne({
            where: { id: documentId },
        });

        if (!kycDocument) {
            throw new NotFoundException(`KYC document with ID ${documentId} not found`);
        }

        if (kycDocument.status === 'approved' || kycDocument.status === 'declined') {
            throw new BadRequestException(
                `This KYC verification has already been ${kycDocument.status}`,
            );
        }

        // Upload selfie to S3
        const { key: selfieS3Key, url: selfieS3Url } = await this.s3Service.uploadFile(
            file,
            'selfies',
        );

        // Compare faces using Rekognition
        const comparisonResult = await this.rekognitionService.compareFaces(
            kycDocument.documentS3Key,
            selfieS3Key,
        );

        // Update KYC document
        kycDocument.selfieS3Key = selfieS3Key;
        kycDocument.selfieS3Url = selfieS3Url;
        kycDocument.similarityScore = comparisonResult.similarity;
        kycDocument.status = comparisonResult.isMatch ? 'approved' : 'declined';
        kycDocument.verificationMessage = comparisonResult.message;

        await this.kycDocumentRepository.save(kycDocument);

        // Parse extracted data
        let extractedData = {};
        try {
            extractedData = JSON.parse(kycDocument.rawExtractedText || '{}');
        } catch (e) {
            extractedData = {};
        }

        return {
            id: kycDocument.id,
            userId: kycDocument.userId,
            isMatch: comparisonResult.isMatch,
            similarity: comparisonResult.similarity,
            status: kycDocument.status as 'approved' | 'declined',
            message: comparisonResult.message,
            selfieUrl: selfieS3Url,
            documentUrl: kycDocument.documentS3Url,
            documentData: {
                documentNumber: kycDocument.documentNumber,
                fullName: kycDocument.fullName,
                dateOfBirth: kycDocument.dateOfBirth,
                nationality: kycDocument.nationality,
                ...extractedData,
            },
        };
    }

    async getKycDocument(id: string): Promise<KycDocument> {
        const document = await this.kycDocumentRepository.findOne({
            where: { id },
        });

        if (!document) {
            throw new NotFoundException(`KYC document with ID ${id} not found`);
        }

        return document;
    }

    async getKycDocumentsByUser(userId: string): Promise<KycDocument[]> {
        return this.kycDocumentRepository.find({
            where: { userId },
            order: { createdAt: 'DESC' },
        });
    }
}
